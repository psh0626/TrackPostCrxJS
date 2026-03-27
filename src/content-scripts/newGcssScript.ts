import ExchangeRateUtil from "../lib/exchangeRateUtil";
import { IMICSettings } from "../lib/IMICSettings";
import { CMD, MSG } from "../lib/message-hub/Message";
import { PostElement } from "../lib/PostUtil";
import InjectUtil from "./inject-dom/injectUtil";
import * as GcssHelper from "./inject-dom/newGcssInjectUtil";
import GcssLoadingMask from "./inject-dom/newGcssLoadingMask";
import newGcssInsertAuthorColumn from "./inject-dom/newGcssSumUtil";
import { GcssWorkflowService } from "./pending-replies/newGcssReplies";
import { GcssPrefillObject } from "./pending-replies/newGcssWrapper";

(async () => {
    console.log("Content script loaded at: " + document.readyState);

    const settings = new IMICSettings();
    await settings.requestLoad();
    GcssWorkflowService.settings = settings;

    await ExchangeRateUtil.initialize();

    let lastPostElement: PostElement | null = null;
    let isInjecting = false;

    (window as any).navigation.addEventListener("navigate", async (e: any) => {
        const url = new URL(e.destination.url);
        console.log("Navigated to:", url.href);

        const paramURL = new URL(url.href.replace("/#", ""));
        console.log("url with params:", paramURL);

        if (settings.GcssUnreadReplies || settings.GcssUnreadRequests) GcssWorkflowService.fetchWorkflows();
        GcssHelper.InjectIdSearchInput();
        injectBasedOnURL(paramURL);
    });

    chrome.runtime.onMessage.addListener((message: MSG) => {
        switch (message.Command) {
            case CMD.FETCH_REQUEST:
                GcssWorkflowService.fetchWorkflows();
                break;
            case CMD.SETTINGS_CHANGED:
                void (async () => {
                    await settings.requestLoad();
                    GcssWorkflowService.settings = settings;
                    console.log("Settings Reloaded", settings, GcssWorkflowService.settings);
                })();
                break;
        }
    });

    (async function Main() {
        GcssLoadingMask.injectMask();
        GcssHelper.InjectIdSearchInput();
        const paramURL = new URL(location.href.replace("/#", ""));
        console.log("location url with params:", paramURL);

        injectBasedOnURL(paramURL);
    })();

    async function injectBasedOnURL(url: URL) {
        if (isInjecting) {
            if (!url.searchParams.has("form")) {
                console.log("[injectBasedOnURL] Left form page, resetting injection lock");
                isInjecting = false;
            } else return;
        }
        isInjecting = true;
        const isRequestingPage = checkURLIfRequesting(url);
        if (isRequestingPage) {
            const itemId = url.pathname.replace("/items/", "").split("/")[0];

            let promises = await Promise.allSettled([
                fetchPostElement(itemId),
                GcssWorkflowService.fetchPrefillData(itemId),
                GcssHelper.waitUntilRequestTypeSelected(),
            ]);

            if (promises.some((p) => p.status === "rejected")) {
                console.error("One or more promises were rejected:", promises);
                isInjecting = false;
                return;
            }

            const postElement =
                promises[0].status === "fulfilled" && promises[0].value?.ItemTracked
                    ? promises[0].value
                    : await fetchPostElement(itemId);

            const prefillData =
                promises[1].status === "fulfilled"
                    ? promises[1].value
                    : await GcssWorkflowService.fetchPrefillData(itemId);

            const requestTypeSelected = promises[2].status === "fulfilled" ? promises[2].value : false;

            if (!postElement || !prefillData) {
                console.error("Failed to fetch post element or prefill data for item ID:", itemId);
                isInjecting = false;
                return;
            }

            if (requestTypeSelected) {
                await injectRequestForm(postElement, prefillData);
            }
            if (await GcssHelper.waitUntilRequestTypeChanged()) {
                GcssLoadingMask.showLoadingMask();
                console.log("Request type changed, reinjecting form with new request type conditions");

                await InjectUtil.wait(1500);
                await injectRequestForm(postElement, prefillData);
            }
        } else if (url.pathname.includes("/update-messages/")) {
            await newGcssInsertAuthorColumn(url);
        }
        isInjecting = false;
    }
    function checkURLIfRequesting(url: URL) {
        const formParam = url.searchParams.get("form")!;
        if (/(L\d\d?Q)/.test(formParam)) {
            console.log("Request form detected:", formParam);
            return true as const;
        }
        return false as const;
    }

    async function fetchPostElement(itemId: string): Promise<PostElement | null> {
        let postElement: PostElement | null = null;

        if (lastPostElement && lastPostElement.ItemID === itemId) {
            console.log("Post element already fetched for item ID:", itemId);
            postElement = lastPostElement;
        } else {
            postElement = await GcssHelper.getPostElement(itemId);
            console.log("Fetched post element:", postElement);
        }

        if (!postElement) {
            console.error("Post element not found for item ID:", itemId);
            return null;
        }

        lastPostElement = postElement;
        return postElement;
    }

    async function injectRequestForm(postElement: PostElement | null, prefillData: GcssPrefillObject | null) {
        console.log("[InjectRequestForm] Injecting request form with post element:", postElement);
        console.log("[InjectRequestForm] Injecting request form with prefill data:", prefillData);

        const perfMarks: PerformanceMark[] = [];
        perfMarks.push(performance.mark("Start Injecting"));

        GcssLoadingMask.showLoadingMask();

        const formInfo = GcssHelper.getCurrentRequestInfo();
        console.log("[InjectRequestForm] Current form info:", formInfo);

        // TODO: try and replace it with chrome.webRequest API to detect form load more efficiently instead of waiting for a fixed input element
        await GcssHelper.getInput("itemOriginCountry", 50, 100); // Wait for form to load by checking the presence of a key input
        perfMarks.push(performance.mark("Original Content Loaded"));
        perfMarks.push(performance.mark("Start Finding Elements"));
        const { formValues } = await GcssHelper.resolveRequestFormElements(formInfo);

        perfMarks.push(performance.mark("End Finding Elements"));

        await GcssHelper.applyRequestFormDefaults(formValues);

        await GcssHelper.injectValueInputs(formValues, prefillData || {});

        await GcssHelper.applyPostElementFormValues(formInfo, formValues, postElement);
        perfMarks.push(performance.mark("Finished Injecting"));
        GcssHelper.finalizeInjectRequestForm(perfMarks);
    }
})();
