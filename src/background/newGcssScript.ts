import { IMICSettings } from "../lib/IMICSettings";
import { PostElement } from "../lib/PostUtil";
import InjectUtil from "./inject-dom/injectUtil";
import NewGcssInjectUtil, { FormElements, ResolvedFormElements } from "./inject-dom/newGcssInjectUtil";
import newGcssInsertAuthorColumn from "./inject-dom/newGcssSumUtil";
import { CMD, MSG } from "./message-hub/Message";
import { GcssWorkflowService } from "./pending-replies/newGcssReplies";
import { GcssPrefillObject } from "./pending-replies/newGcssWrapper";

(async () => {
    console.log("Content script loaded at: " + document.readyState);

    const settings = new IMICSettings();
    await settings.requestLoad();
    GcssWorkflowService.settings = settings;

    let lastPostElement: PostElement | null = null;
    let isInjecting = false;

    (window as any).navigation.addEventListener("navigate", async (e: any) => {
        const url = new URL(e.destination.url);
        console.log("Navigated to:", url.href);

        const paramURL = new URL(url.href.replace("/#", ""));
        console.log("url with params:", paramURL);

        if (settings.GcssUnreadReplies || settings.GcssUnreadRequests) GcssWorkflowService.fetchWorkflows();
        NewGcssInjectUtil.InjectIdSearchInput();
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
        injectLoadingMask();
        NewGcssInjectUtil.InjectIdSearchInput();
        const paramURL = new URL(location.href.replace("/#", ""));
        console.log("location url with params:", paramURL);

        injectBasedOnURL(paramURL);
    })();

    async function injectBasedOnURL(url: URL) {
        if (isInjecting) return;
        isInjecting = true;
        const [isRequestingPage, requestLevel] = checkURLIfRequesting(url);
        if (isRequestingPage) {
            const itemId = url.pathname.replace("/items/", "");

            let promises = await Promise.allSettled([
                fetchPostElement(itemId),
                GcssWorkflowService.fetchPrefillData(itemId),
                waitUntilRequestTypeSelected(),
            ]);

            if (promises.some((p) => p.status === "rejected")) {
                console.error("One or more promises were rejected:", promises);
                return;
            }

            const postElement = promises[0].status === "fulfilled" ? promises[0].value : await fetchPostElement(itemId);
            const prefillData =
                promises[1].status === "fulfilled"
                    ? promises[1].value
                    : await GcssWorkflowService.fetchPrefillData(itemId);

            if (!postElement || !prefillData) {
                console.error("Failed to fetch post element or prefill data for item ID:", itemId);
            }

            await InjectRequestForm(postElement, prefillData);
        } else if (url.pathname.includes("/update-messages/")) {
            await newGcssInsertAuthorColumn(url);
        }
        isInjecting = false;
    }
    function checkURLIfRequesting(url: URL) {
        const formParam = url.searchParams.get("form")!;
        if (/(L\d\d?Q)/.test(formParam)) {
            console.log("Request form detected:", formParam);
            return [true, formParam] as const;
        }
        return [false, null] as const;
    }

    async function fetchPostElement(itemId: string): Promise<PostElement | null> {
        let postElement: PostElement | null = null;

        if (lastPostElement && lastPostElement.ItemID === itemId) {
            console.log("Post element already fetched for item ID:", itemId);
            postElement = lastPostElement;
        } else {
            postElement = await findPostElement(itemId);
            console.log("Fetched post element:", postElement);
        }

        if (!postElement) {
            console.error("Post element not found for item ID:", itemId);
            return null;
        }

        lastPostElement = postElement;
        return postElement;
    }

    async function waitUntilRequestTypeSelected(): Promise<void> {
        const requestType = await InjectUtil.TryQuerySelectFor<HTMLInputElement>(
            "input[aria-labelledby='requestType']",
        );
        if (!requestType) {
            console.log("Request type input not found");
            return;
        }
        do {
            await InjectUtil.wait(100);
        } while (!requestType.value);
        console.log("Request type selected:", requestType.value);
    }
    async function waitUntilRequestTypeChanged(): Promise<boolean> {
        const requestType = await InjectUtil.TryQuerySelectFor<HTMLInputElement>(
            "input[aria-labelledby='requestType']",
        );
        if (!requestType) {
            console.log("Request type input not found");
            return false;
        }
        const initialValue = requestType.value;
        do {
            await InjectUtil.wait(100);
        } while (requestType.value === initialValue);
        console.log("Request type changed to:", requestType.value);
        return Promise.resolve(true);
    }
    function getCurrentRequestInfo() {
        const url = new URL(location.href.replace("/#", ""));
        const form = {
            itemId: url.pathname.split("/items/")[1]?.split("/")[0] || null,
            level: url.searchParams.get("form"),
            serviceType: url.searchParams.get("qualifiedProduct"),
            requestType: url.searchParams.get("requestType"),
        };
        return form;
    }
    async function InjectRequestForm(postElement: PostElement | null, prefillData: GcssPrefillObject | null) {
        console.log("[InjectRequestForm] Injecting request form with post element:", postElement);
        console.log("[InjectRequestForm] Injecting request form with prefill data:", prefillData);

        const perfMarks: PerformanceMark[] = [];
        perfMarks.push(performance.mark("Start Injecting"));

        ShowLoadingMask();

        const formInfo = getCurrentRequestInfo();
        console.log("[InjectRequestForm] Current form info:", formInfo);

        await getInput("itemOriginCountry", 50, 100); // Wait for form to load by checking the presence of a key input
        perfMarks.push(performance.mark("Original Content Loaded"));

        const elements: FormElements = {
            itemDestinationCountry: () => getInput("itemDestinationCountry"),
            contentType: () => getInput("itemDetails.contentType"),
            itemType: () => getInput("itemDetails.itemType"),
            physicalDescription: () => getInput("itemDetails.physicalDescription"),
            dateOfPosting: () => getInput("itemDetails.dateOfPosting"),
            destinationPostcode: () => getInput("itemDetails.destinationPostcode"),
            contents: () => getInput("itemDetails.contents"),
            itemWeight: () => getInput("itemDetails.itemWeight"),
            itemValue: () => getInput("itemDetails.itemValue"),
            itemValueCurrency: () => getInput("itemDetails.itemValueCurrency"),
            postagePaid: () => getInput("itemDetails.postagePaid"),
            postagePaidCurrency: () => getInput("itemDetails.postagePaidCurrency"),
            indemnityAmount: () => getInput("itemDetails.indemnityAmount"),
            indemnityAmountCurrency: () => getInput("itemDetails.indemnityAmountCurrency"),
            podRequired: () => getInputByName("itemDetails.podRequired"),
            addresseeName: () => getInput("addresseeDetails.addresseeName"),
            addresseeStreet: () => getInput("addresseeDetails.addresseeStreet"),
            addresseePostcode: () => getInput("addresseeDetails.addresseePostcode"),
            addresseeCity: () => getInput("addresseeDetails.addresseeCity"),
            addresseeTelephone: () => getInput("addresseeDetails.addresseeTelephone"),
            addresseeEmail: () => getInput("addresseeDetails.addresseeEmail"),
            senderName: () => getInput("senderDetails.senderName"),
            senderStreet: () => getInput("senderDetails.senderStreet"),
            senderPostcode: () => getInput("senderDetails.senderPostcode"),
            senderCity: () => getInput("senderDetails.senderCity"),
            senderTelephone: () => getInput("senderDetails.senderTelephone"),
            senderEmail: () => getInput("senderDetails.senderEmail"),
        };
        const excludeConditions = [
            {
                condition: () => ["EMS", "UPU"].includes(formInfo.serviceType ?? ""),
                elements: ["itemType", "destinationPostcode"] as const,
            },
            {
                condition: () => formInfo.requestType?.includes("COD"),
                elements: ["contentType"] as const,
            },
            {
                condition: () =>
                    formInfo.level === "L1Q" && ["COD", "RETURN"].some((type) => formInfo.requestType?.includes(type)),
                elements: [
                    "physicalDescription",
                    "contents",
                    "itemWeight",
                    "itemValue",
                    "itemValueCurrency",
                    "postagePaid",
                    "postagePaidCurrency",
                    "indemnityAmount",
                    "indemnityAmountCurrency",
                    "podRequired",
                ] as const,
            },
            {
                condition: () =>
                    formInfo.level === "L1Q" &&
                    ["UPDATE", "CUSTOMS", "MISSENT", "CHANGE", "DELAYED"].some((type) =>
                        formInfo.requestType?.includes(type),
                    ),
                elements: ["indemnityAmount", "indemnityAmountCurrency"] as const,
            },
            {
                condition: () => formInfo.level === "L1Q" && formInfo.requestType?.includes("RETURN"),
                elements: ["contentType", "senderTelephone", "senderEmail"] as const,
            },
            {
                condition: () => formInfo.level === "L1Q" && formInfo.requestType?.includes("WPOD"),
                elements: [
                    "itemValue",
                    "itemValueCurrency",
                    "postagePaid",
                    "postagePaidCurrency",
                    "indemnityAmount",
                    "indemnityAmountCurrency",
                    "podRequired",
                ] as const,
            },
            {
                condition: () => ["CHANGE", "DELAYED"].some((type) => formInfo.requestType?.includes(type)),
                elements: [
                    "contentType",
                    "contents",
                    "itemValue",
                    "itemValueCurrency",
                    "postagePaid",
                    "postagePaidCurrency",
                ] as const,
            },
            {
                condition: () => formInfo.requestType?.includes("DELAYED"),
                elements: ["physicalDescription", "podRequired", "senderTelephone", "senderEmail"] as const,
            },
        ];

        const elementsToExclude = excludeConditions
            .filter(({ condition }) => condition())
            .flatMap(({ elements: elems }) => elems);

        console.log("[InjectRequestForm] Exclude conditions for elements in", formInfo.requestType, elementsToExclude);
        const finalElements = Object.entries(elements).filter(([key]) => !elementsToExclude.includes(key as any));

        perfMarks.push(performance.mark("Start Finding Elements"));
        const elementPromises = await Promise.allSettled(
            finalElements.map(async ([key, promise]) => {
                const perfStart = performance.now();
                const el = await promise();
                const perfDuration = performance.now() - perfStart;
                if (perfDuration > 1000) {
                    console.log(`[InjectRequestForm] Finding "${key}" took ${perfDuration.toFixed(2)}ms`);
                }
                return [key, el] as const;
            }),
        );

        const elementsFulfilled = elementPromises
            .filter((p) => p.status === "fulfilled")
            .map((p) => [p.value[0], p.value[1]] as const);
        console.log("[InjectRequestForm] Element promises fulfilled", elementsFulfilled);

        const elementsNotFound = elementPromises
            .filter((p) => p.status === "rejected" || !p.value[1])
            .map((p) => (p.status === "rejected" ? p.reason : p.value[0]))
            .filter((p) => !elementsToExclude.includes(p));

        if (elementsNotFound.length > 0) {
            console.log("[InjectRequestForm] Current form info:", formInfo);
            console.log("[InjectRequestForm] Elements not found:", elementsNotFound);
        }

        const thisForm = Object.fromEntries(elementsFulfilled) as { [K in keyof typeof elements]?: HTMLInputElement };

        perfMarks.push(performance.mark("End Finding Elements"));

        fillBlankInputs([
            thisForm.physicalDescription,
            thisForm.destinationPostcode,
            thisForm.addresseeName,
            thisForm.addresseeStreet,
            thisForm.addresseePostcode,
            thisForm.addresseeCity,
            thisForm.senderName,
            thisForm.senderStreet,
            thisForm.senderPostcode,
            thisForm.senderCity,
        ]);

        if (thisForm.contentType) await setSelect("itemDetails.contentType", "OTHER_VARIOUS");

        if (thisForm.itemType) await setSelect("itemDetails.itemType", "PACKET");

        if (thisForm.itemWeight && !thisForm.itemWeight.value) {
            thisForm.itemWeight.value = "0.00";
        }

        if (thisForm.podRequired && thisForm.podRequired.checked === false) {
            thisForm.podRequired.parentElement?.click();
        }

        await injectValueInputs(thisForm, prefillData || {});

        if (formInfo.level !== "L1Q") {
            InjectUtil.wait(500).then(async () => {
                document.querySelector(".overflow-auto")?.scrollTo({ behavior: "smooth", top: 2480 });
            });
        } else if (postElement) {
            if (thisForm.dateOfPosting && !thisForm.dateOfPosting.value) {
                const date = postElement.ApplicationDate;
                const year = date.substring(0, 4);
                const month = date.substring(4, 6);
                const day = date.substring(6, 8);
                thisForm.dateOfPosting.value = `${year}-${month}-${day}`;
            }
            if (thisForm.itemDestinationCountry && !thisForm.itemDestinationCountry.value) {
                NewGcssInjectUtil.SwitchValue(thisForm.itemDestinationCountry, postElement.Destination);
            }
            if (thisForm.destinationPostcode && thisForm.destinationPostcode.value === "-") {
                NewGcssInjectUtil.SwitchValue(thisForm.destinationPostcode, postElement.AddresseeZipcode);
            }
            if (thisForm.contents) {
                NewGcssInjectUtil.SwitchValue(thisForm.contents, postElement.Contents);
            }
            if (thisForm.addresseeName) {
                NewGcssInjectUtil.SwitchValue(thisForm.addresseeName, postElement.AddresseeName);
            }
            if (thisForm.addresseeStreet) {
                NewGcssInjectUtil.SwitchValue(thisForm.addresseeStreet, postElement.AddresseeAddress);
            }
            if (thisForm.addresseeTelephone) {
                NewGcssInjectUtil.SwitchValue(thisForm.addresseeTelephone, postElement.AddresseePhone);
            }
            if (thisForm.addresseePostcode) {
                NewGcssInjectUtil.SwitchValue(thisForm.addresseePostcode, postElement.AddresseeZipcode);
            }
            if (thisForm.senderName) {
                NewGcssInjectUtil.SwitchValue(thisForm.senderName, postElement.SenderName);
            }
            if (thisForm.senderStreet) {
                NewGcssInjectUtil.SwitchValue(thisForm.senderStreet, postElement.SenderAddress);
            }
            if (thisForm.senderTelephone) {
                NewGcssInjectUtil.SwitchValue(thisForm.senderTelephone, postElement.SenderPhone);
            }
            const callCenterSelect = await tryGetSelect("messageRouting.receivingCallCenterUpuCode");
            if (callCenterSelect) {
                InjectUtil.wait(500).then(async () => {
                    document.querySelector(".overflow-auto")?.scrollTo({ behavior: "smooth", top: 200 });
                    if (callCenterSelect.textContent === "Select Destination Call Center") {
                        await InjectUtil.wait(500);
                        simulateSelectClick(callCenterSelect);
                    }
                });
            }
        }
        perfMarks.push(performance.mark("Finished Injecting"));
        InjectUtil.wait(1000).then(() => {
            hideLoadingMask();
            perfMarks.push(performance.mark("End Loading Mask"));
            const perfMeasures = perfMarks.map((currentMark, idx, marks) => {
                if (idx === 0) return null;
                return performance.measure(
                    `Time from '${marks[idx - 1]?.name || "start"}' to '${currentMark.name}'`,
                    marks[idx - 1]?.name || marks[0].name,
                    currentMark.name,
                );
            });
            perfMeasures.forEach((measure) => {
                if (measure) {
                    console.log(`[InjectRequestForm] ${measure.name}: ${measure.duration.toFixed(2)}ms`);
                }
            });
            console.log(
                `[InjectRequestForm] Total injection time: ${(performance.now() - perfMarks[0].startTime).toFixed(2)}ms`,
            );
        });
        if (await waitUntilRequestTypeChanged()) {
            ShowLoadingMask();
            console.log("Request type changed, reinjecting form with new request type conditions");
            // if (thisForm.itemValue?.value === prefillData?.itemValue) {
            //     console.log("Value reverted due to request type change, reinjecting converted values");
            //     selectAutoCompleteOption(thisForm.itemValueCurrency!, prefillData?.itemValueCurrency || "USD");
            // }
            // if (thisForm.postagePaid?.value === prefillData?.postagePaid) {
            //     console.log("Value reverted due to request type change, reinjecting converted values");
            //     selectAutoCompleteOption(thisForm.postagePaidCurrency!, prefillData?.postagePaidCurrency || "KRW");
            // }
            // const monitorResponse = await new MSG(CMD.NEW_GCSS_MONITOR_PREFILL_REQUEST, formInfo.itemId!).getResponse();
            // console.log("Monitor response received after request type change:", monitorResponse);
            await InjectUtil.wait(1500);
            await InjectRequestForm(postElement, prefillData);
        }
    }
    function injectLoadingMask() {
        const maskId = "IMIC-LOADING-MASK";
        if (!document.getElementById(maskId)) {
            const mask = document.createElement("div");
            mask.id = maskId;
            mask.style.cssText = `
                display: flex;
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(255, 255, 255, 0.8);
                backdrop-filter: blur(5px);
                z-index: 9999;
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 2rem;
                font-weight: 900;
                transition: opacity 0.3s ease;
                pointer-events: none;
            `;
            mask.style.opacity = "0";
            mask.innerText = "자동 입력 중";
            document.body.appendChild(mask);
        }
        return document.getElementById(maskId)!;
    }
    function ShowLoadingMask() {
        const mask = injectLoadingMask();
        mask.style.opacity = "1";
        // InjectUtil.wait(5000).then(() => {
        //     mask.style.opacity = "0";
        // });
    }
    function hideLoadingMask() {
        const mask = injectLoadingMask();
        if (mask) {
            mask.style.opacity = "0";
        }
    }

    function fillBlankInputs(inputs: (HTMLInputElement | null | undefined)[] | HTMLInputElement | null | undefined) {
        if (Array.isArray(inputs)) {
            inputs.forEach((input) => {
                if (input && !input.value) {
                    input.value = "-";
                }
            });
        } else if (inputs && !inputs.value) {
            inputs.value = "-";
        }
    }
    function getInputByName(name: string) {
        return InjectUtil.TryQuerySelectFor<HTMLInputElement>(`input[name='${name}']`);
    }
    function getInput(name: string, maxTries: number = 10, waitTime: number = 200) {
        return InjectUtil.TryQuerySelectFor<HTMLInputElement>(`input[aria-labelledby='${name}']`, maxTries, waitTime);
    }
    function tryGetSelect(name: string) {
        return InjectUtil.TryQuerySelectFor<HTMLDivElement>(`div[aria-labelledby='${name}']`);
    }
    function simulateSelectClick(select: HTMLDivElement) {
        select.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    }
    async function setSelect(name: string | HTMLInputElement, value: string) {
        const select = name instanceof HTMLInputElement ? name : await tryGetSelect(name);
        if (!select) {
            console.log(`Select element with aria-labelledby='${name}' not found`);
            return;
        }
        simulateSelectClick(select);
        const liValue = await InjectUtil.TryQuerySelectFor<HTMLLIElement>(`li[data-value='${value}']`, 10, 100);
        if (!liValue) {
            console.log(`Option with data-value='${value}' not found for select '${name}'`);
            return;
        }
        liValue.click();
    }
    async function selectAutoCompleteOption(input: HTMLInputElement, optionText: string) {
        simulateSelectClick(input);
        const option: HTMLLIElement | null = await new Promise(async (resolve) => {
            const maxTrial = 30;
            const waitTime = 100;
            await InjectUtil.wait(100);
            for (let i = 0; i < maxTrial; i++) {
                const foundOption = Array.from(document.querySelectorAll("li")).find(
                    (el) => el.textContent === optionText,
                );
                if (foundOption) {
                    console.log(
                        `[selectAutoCompleteOption] ${input.getAttribute("aria-labelledby")} Option with text='${optionText}' found after ${i + 1} trial(s)`,
                    );
                    resolve(foundOption);
                    return;
                }
                input.value = optionText;
                simulateSelectClick(input);
                await InjectUtil.wait(waitTime);
            }
            console.log(
                `[selectAutoCompleteOption] ${input.getAttribute("aria-labelledby")} Auto-complete option with text='${optionText}' not found after waiting ${(maxTrial * waitTime) / 1000} seconds`,
            );
            resolve(null);
        });
        if (option) {
            option.click();
            return;
        }
    }

    function findPostElement(item_id: string): Promise<PostElement> {
        return new MSG(CMD.FETCH_POST_ELEMENT, item_id).getResponse<PostElement>();
    }
    class ExchangeRateUtil {
        private static rates: { [key: string]: number } = {
            SDR: 1749,
            USD: 1600,
            EUR: 1900,
            KRW: 1,
            GBP: 2200,
            JPY: 12,
            CNY: 300,
        };

        static getRate(currency: string): number {
            if (!this.rates[currency]) {
                console.warn(`Exchange rate for ${currency} not found. Defaulting to USD rate.`);
                return this.rates.USD;
            }
            return this.rates[currency];
        }

        static convert(amount: number, fromCurrency: string, toCurrency: string): number {
            const fromRate = this.getRate(fromCurrency);
            const toRate = this.getRate(toCurrency);
            return (amount * fromRate) / toRate;
        }
        static calculateSDR(input: string, currency: string) {
            const inputValue = parseFloat(input || "0");
            const calcValue = this.convert(inputValue, currency, "SDR");
            return Math.ceil(calcValue).toString();
        }
        static async injectConvertedValue(
            targetElements: { valueInput: HTMLInputElement; currencyInput: HTMLInputElement },
            prefill?: { value?: string; currency?: string },
        ) {
            const { valueInput, currencyInput } = targetElements;
            if (!valueInput || !currencyInput) {
                console.log("Value or currency element not found, cannot inject converted value.");
                return;
            }

            if (!valueInput.value && prefill?.value) {
                valueInput.value = prefill.value;
            }
            if (!currencyInput.value && prefill?.currency) {
                await selectAutoCompleteOption(currencyInput, prefill.currency);
            }

            const sdrValue = this.calculateSDR(
                prefill?.value || valueInput.value,
                prefill?.currency || currencyInput.value,
            );
            const inputLabel = valueInput.getAttribute("aria-labelledby")?.replaceAll(".", "-");
            const currencyLabel = currencyInput.getAttribute("aria-labelledby")?.replaceAll(".", "-");

            NewGcssInjectUtil.SwitchValueForCurrency(valueInput, currencyInput, sdrValue);

            // Retry setting value until it sticks
            for (let i = 0; i < 5; i++) {
                valueInput.value = sdrValue;
                await InjectUtil.wait(100);
                if (valueInput.value === sdrValue) break;
            }

            // if (!document.querySelector("#IMIC-" + inputLabel)) {
            //     console.log("[injectConvertedValue] Tooltip element not found for input:", inputLabel);
            //     await InjectUtil.wait(1200);
            //     const [newInput, newCurrency] = await Promise.all([getInput(inputLabel!), getInput(currencyLabel!)]);
            //     this.injectConvertedValue({ valueInput: newInput!, currencyInput: newCurrency! }, prefill);
            //     return;
            // }

            await selectAutoCompleteOption(currencyInput, "SDR");
        }
    }

    async function injectValueInputs(
        thisForm: Partial<ResolvedFormElements>,
        prefillValues: Partial<GcssPrefillObject>,
    ) {
        const promises = [];
        if (thisForm.itemValue && thisForm.itemValueCurrency) {
            const targetInputs = {
                valueInput: thisForm.itemValue,
                currencyInput: thisForm.itemValueCurrency!,
            } as const;
            const targetPrefill = {
                value: prefillValues.itemValue || undefined,
                currency: prefillValues.itemValueCurrency || undefined,
            } as const;
            const itemValuePromise = ExchangeRateUtil.injectConvertedValue(targetInputs, targetPrefill);
            promises.push(itemValuePromise);
        }
        if (thisForm.postagePaid && thisForm.postagePaidCurrency) {
            const targetInputs = {
                valueInput: thisForm.postagePaid,
                currencyInput: thisForm.postagePaidCurrency,
            } as const;
            const targetPrefill = {
                value: prefillValues.postagePaid || undefined,
                currency: prefillValues.postagePaidCurrency || undefined,
            } as const;
            const postagePaidPromise = ExchangeRateUtil.injectConvertedValue(targetInputs, targetPrefill);
            promises.push(postagePaidPromise);
        }
        const perfStart = performance.now();
        await Promise.all(promises);
        const perfDuration = performance.now() - perfStart;
        if (perfDuration > 1000) {
            console.log(`[injectValueInputs] Injecting converted values took ${perfDuration.toFixed(2)}ms`);
        }

        if (thisForm.indemnityAmount && !thisForm.indemnityAmount.value) {
            const indemnityValue = parseFloat(thisForm.itemValue!.value) + parseFloat(thisForm.postagePaid!.value);
            NewGcssInjectUtil.SwitchValueForCurrency(
                thisForm.indemnityAmount!,
                thisForm.indemnityAmountCurrency!,
                indemnityValue.toString(),
            );
            thisForm.indemnityAmount.value = indemnityValue.toString();
            selectAutoCompleteOption(thisForm.indemnityAmountCurrency!, "SDR");
        }
    }
})();
