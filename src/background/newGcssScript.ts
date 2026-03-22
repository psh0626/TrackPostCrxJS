import { IMICSettings } from "../lib/IMICSettings";
import { PostElement } from "../lib/PostUtil";
import InjectUtil from "./inject-dom/injectUtil";
import NewGcssInjectUtil, { FormElements, ResolvedFormElements } from "./inject-dom/newGcssInjectUtil";
import GcssLoadingMask from "./inject-dom/newGcssLoadingMask";
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
        GcssLoadingMask.injectMask();
        NewGcssInjectUtil.InjectIdSearchInput();
        const paramURL = new URL(location.href.replace("/#", ""));
        console.log("location url with params:", paramURL);

        injectBasedOnURL(paramURL);
    })();

    async function injectBasedOnURL(url: URL) {
        if (!url.searchParams.has("form")) {
            console.log("[injectBasedOnURL] Left form page, resetting injection lock");
            isInjecting = false;
        }
        if (isInjecting) return;
        isInjecting = true;
        const [isRequestingPage, requestLevel] = checkURLIfRequesting(url);
        if (isRequestingPage) {
            const itemId = url.pathname.replace("/items/", "").split("/")[0];

            let promises = await Promise.allSettled([
                fetchPostElement(itemId),
                GcssWorkflowService.fetchPrefillData(itemId),
                waitUntilRequestTypeSelected(),
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

            if (!postElement || !prefillData) {
                console.error("Failed to fetch post element or prefill data for item ID:", itemId);
                isInjecting = false;
                return;
            }

            await injectRequestForm(postElement, prefillData);
            if (await waitUntilRequestTypeChanged()) {
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
    type CurrentRequestInfo = ReturnType<typeof getCurrentRequestInfo>;
    type RequestFormElementKey = keyof FormElements;
    type RequestFormValues = Partial<ResolvedFormElements>;

    function createRequestFormElements(): FormElements {
        return {
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
    }

    function includesAny(str: string | null, substrings: string[] | string) {
        if (!str) return false;
        if (!Array.isArray(substrings)) {
            substrings = [substrings];
        }
        return substrings.some((substring) => str.includes(substring));
    }

    function getExcludedRequestFormElements(formInfo: CurrentRequestInfo): RequestFormElementKey[] {
        const excludeGroups: { condition: boolean; elements: RequestFormElementKey[] }[] = [
            {
                condition: !includesAny(formInfo.serviceType, ["REG", "EXPRES"]),
                elements: ["itemType", "destinationPostcode"],
            },
            {
                condition: includesAny(formInfo.requestType, "COD"),
                elements: ["contentType"],
            },
            {
                condition:
                    formInfo.level === "L1Q" && includesAny(formInfo.requestType, ["WPOD", "COD", "RETURN", "ADVICE"]),
                elements: [
                    "itemValue",
                    "itemValueCurrency",
                    "postagePaid",
                    "postagePaidCurrency",
                    "indemnityAmount",
                    "indemnityAmountCurrency",
                    "podRequired",
                ],
            },
            {
                condition: formInfo.level === "L1Q" && includesAny(formInfo.requestType, ["COD", "RETURN"]),
                elements: ["physicalDescription", "contents", "itemWeight"],
            },
            {
                condition:
                    formInfo.level === "L1Q" &&
                    includesAny(formInfo.requestType, ["UPDATE", "CUSTOMS", "MISSENT", "CHANGE", "DELAYED"]),
                elements: ["indemnityAmount", "indemnityAmountCurrency"],
            },
            {
                condition: formInfo.level === "L1Q" && includesAny(formInfo.requestType, "RETURN"),
                elements: ["contentType", "senderTelephone", "senderEmail"],
            },
            {
                condition: includesAny(formInfo.requestType, ["CHANGE", "DELAYED"]),
                elements: [
                    "contentType",
                    "contents",
                    "itemValue",
                    "itemValueCurrency",
                    "postagePaid",
                    "postagePaidCurrency",
                ],
            },
            {
                condition: includesAny(formInfo.requestType, "DELAYED"),
                elements: ["physicalDescription", "podRequired", "senderTelephone", "senderEmail"],
            },
            {
                condition: includesAny(formInfo.requestType, "DISPUTE"),
                elements: ["itemType", "destinationPostcode"],
            },
            {
                condition: includesAny(formInfo.requestType, "ADVICE"),
                elements: ["contentType", "physicalDescription", "contents", "itemWeight"],
            },
        ];

        const excludedElements = new Set<RequestFormElementKey>();
        excludeGroups
            .filter(({ condition: shouldExclude }) => shouldExclude)
            .forEach(({ elements }) => {
                elements.forEach((elementKey) => excludedElements.add(elementKey));
            });

        return Array.from(excludedElements);
    }

    async function resolveRequestFormElements(formInfo: CurrentRequestInfo) {
        const elements = createRequestFormElements();
        const excludedElements = getExcludedRequestFormElements(formInfo);
        const excludedElementSet = new Set(excludedElements);
        const activeElements = Object.entries(elements).filter(
            ([key]) => !excludedElementSet.has(key as RequestFormElementKey),
        ) as [RequestFormElementKey, NonNullable<FormElements[RequestFormElementKey]>][];

        console.log("[InjectRequestForm] Exclude conditions for elements in", formInfo.requestType, excludedElements);

        const elementPromises = await Promise.allSettled(
            activeElements.map(async ([key, resolveElement]) => {
                const perfStart = performance.now();
                const element = await resolveElement();
                const perfDuration = performance.now() - perfStart;
                if (perfDuration > 1000) {
                    console.log(`[InjectRequestForm] Finding "${key}" took ${perfDuration.toFixed(2)}ms`);
                }
                return [key, element] as const;
            }),
        );

        const fulfilledElements = elementPromises
            .filter((result) => result.status === "fulfilled")
            .map((result) => [result.value[0], result.value[1]] as const);
        const missingElements = activeElements
            .filter((_, index) => {
                const result = elementPromises[index];
                return result.status === "rejected" || !result.value[1];
            })
            .map(([key]) => key);

        console.log("[InjectRequestForm] Element promises fulfilled", fulfilledElements);

        if (missingElements.length > 0) {
            console.log("[InjectRequestForm] Current form info:", formInfo);
            console.log("[InjectRequestForm] Elements not found:", missingElements);
        }

        return {
            excludedElements,
            formValues: Object.fromEntries(fulfilledElements) as RequestFormValues,
            missingElements,
        };
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

    async function applyRequestFormDefaults(formValues: RequestFormValues) {
        fillBlankInputs([
            formValues.physicalDescription,
            formValues.destinationPostcode,
            formValues.addresseeName,
            formValues.addresseeStreet,
            formValues.addresseePostcode,
            formValues.addresseeCity,
            formValues.senderName,
            formValues.senderStreet,
            formValues.senderPostcode,
            formValues.senderCity,
        ]);

        if (formValues.contentType) await setSelect("itemDetails.contentType", "OTHER_VARIOUS");
        if (formValues.itemType) await setSelect("itemDetails.itemType", "PACKET");

        if (formValues.itemWeight && !formValues.itemWeight.value) {
            formValues.itemWeight.value = "0.00";
        }

        if (formValues.podRequired && formValues.podRequired.checked === false) {
            formValues.podRequired.parentElement?.click();
        }
    }

    function applyPostElementValue(pairs: Array<[HTMLInputElement | null | undefined, string]>) {
        pairs.forEach(([input, value]) => {
            if (input) {
                NewGcssInjectUtil.SwitchValue(input, value);
            }
        });
    }

    async function applyPostElementFormValues(
        formInfo: CurrentRequestInfo,
        formValues: RequestFormValues,
        postElement: PostElement | null,
    ) {
        if (formInfo.level !== "L1Q") {
            InjectUtil.wait(500).then(async () => {
                document.querySelector(".overflow-auto")?.scrollTo({ behavior: "smooth", top: 2480 });
            });
            return;
        }

        if (!postElement) {
            return;
        }

        if (formValues.dateOfPosting && !formValues.dateOfPosting.value) {
            const date = postElement.ApplicationDate;
            const year = date.substring(0, 4);
            const month = date.substring(4, 6);
            const day = date.substring(6, 8);
            formValues.dateOfPosting.value = `${year}-${month}-${day}`;
        }

        if (formValues.itemDestinationCountry && !formValues.itemDestinationCountry.value) {
            NewGcssInjectUtil.SwitchValue(formValues.itemDestinationCountry, postElement.Destination);
        }

        if (formValues.destinationPostcode && formValues.destinationPostcode.value === "-") {
            NewGcssInjectUtil.SwitchValue(formValues.destinationPostcode, postElement.AddresseeZipcode);
        }

        applyPostElementValue([
            [formValues.contents, postElement.Contents],
            [formValues.addresseeName, postElement.AddresseeName],
            [formValues.addresseeStreet, postElement.AddresseeAddress],
            [formValues.addresseeTelephone, postElement.AddresseePhone],
            [formValues.addresseePostcode, postElement.AddresseeZipcode],
            [formValues.senderName, postElement.SenderName],
            [formValues.senderStreet, postElement.SenderAddress],
            [formValues.senderTelephone, postElement.SenderPhone],
        ]);

        const callCenterSelect = await tryGetSelect("messageRouting.receivingCallCenterUpuCode");

        InjectUtil.wait(500).then(async () => {
            document.querySelector(".overflow-auto")?.scrollTo({ behavior: "smooth", top: 200 });
            if (callCenterSelect?.textContent === "Select Destination Call Center") {
                await InjectUtil.wait(500);
                simulateSelectClick(callCenterSelect);
            }
        });
    }

    function finalizeInjectRequestForm(perfMarks: PerformanceMark[]) {
        InjectUtil.wait(1000).then(() => {
            GcssLoadingMask.hideLoadingMask();
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
    }

    async function injectRequestForm(postElement: PostElement | null, prefillData: GcssPrefillObject | null) {
        console.log("[InjectRequestForm] Injecting request form with post element:", postElement);
        console.log("[InjectRequestForm] Injecting request form with prefill data:", prefillData);

        const perfMarks: PerformanceMark[] = [];
        perfMarks.push(performance.mark("Start Injecting"));

        GcssLoadingMask.showLoadingMask();

        const formInfo = getCurrentRequestInfo();
        console.log("[InjectRequestForm] Current form info:", formInfo);

        await getInput("itemOriginCountry", 50, 100); // Wait for form to load by checking the presence of a key input
        perfMarks.push(performance.mark("Original Content Loaded"));
        perfMarks.push(performance.mark("Start Finding Elements"));
        const { formValues } = await resolveRequestFormElements(formInfo);

        perfMarks.push(performance.mark("End Finding Elements"));

        await applyRequestFormDefaults(formValues);

        await injectValueInputs(formValues, prefillData || {});

        await applyPostElementFormValues(formInfo, formValues, postElement);
        perfMarks.push(performance.mark("Finished Injecting"));
        finalizeInjectRequestForm(perfMarks);
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
