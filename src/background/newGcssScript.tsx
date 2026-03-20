import { IMICSettings } from "../lib/IMICSettings";
import { COMMANDS, MSG, sendRequest } from "../lib/Message";
import { PostElement } from "../lib/PostUtil";
import InjectUtil from "./inject-dom/injectUtil";
import NewGcssInjectUtil from "./inject-dom/newGcssInjectUtil";
import newGcssInsertAuthorColumn from "./inject-dom/newGcssSumUtil";
import { GcssWorkflowService } from "./pending-replies/newGcssReplies";

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
            case COMMANDS.GCSS_UNREAD_REPLIES:
                GcssWorkflowService.fetchWorkflows();
                break;
            case COMMANDS.SETTINGS_CHANGED:
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

        if (settings.GcssUnreadReplies || settings.GcssUnreadRequests) GcssWorkflowService.fetchWorkflows();
        injectBasedOnURL(paramURL);
    })();

    async function injectBasedOnURL(url: URL) {
        if (isInjecting) return;
        isInjecting = true;
        const [isRequestingPage, requestLevel] = checkURLIfRequesting(url);
        if (isRequestingPage) {
            const itemId = url.pathname.replace("/items/", "");
            let promises = await Promise.allSettled([fetchPostElement(itemId), waitUntilRequestTypeSelected()]);

            if (promises.some((p) => p.status === "rejected")) {
                console.error("One or more promises were rejected:", promises);
                return;
            }

            const postElement = promises[0].status === "fulfilled" ? promises[0].value : await fetchPostElement(itemId);

            if (!postElement) {
                console.error("Failed to fetch post element for item ID:", itemId);
            }

            await InjectRequestForm(postElement, requestLevel!);
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

    async function waitUntilRequestTypeSelected(detectChange: boolean = false): Promise<void> {
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
    async function waitUntilRequestTypeChanged(): Promise<void> {
        const requestType = await InjectUtil.TryQuerySelectFor<HTMLInputElement>(
            "input[aria-labelledby='requestType']",
        );
        if (!requestType) {
            console.log("Request type input not found");
            return;
        }
        const initialValue = requestType.value;
        do {
            await InjectUtil.wait(100);
        } while (requestType.value === initialValue);
        console.log("Request type changed to:", requestType.value);
    }
    async function InjectRequestForm(postElement: PostElement | null, requestLevel: string) {
        ShowLoadingMask();
        console.log("Injecting request form with post element:");
        await setSelect("itemDetails.contentType", "OTHER_VARIOUS");
        setSelect("itemDetails.itemType", "PACKET");

        const elements = {
            itemDestinationCountry: getInput("itemDestinationCountry"),

            physicalDescription: getInput("itemDetails.physicalDescription"),
            dateOfPosting: getInput("itemDetails.dateOfPosting"),
            destinationPostcode: getInput("itemDetails.destinationPostcode"),

            contents: getInput("itemDetails.contents"),
            itemWeight: getInput("itemDetails.itemWeight"),
            itemValue: getInput("itemDetails.itemValue"),
            itemValueCurrency: getInput("itemDetails.itemValueCurrency"),
            postagePaid: getInput("itemDetails.postagePaid"),
            postagePaidCurrency: getInput("itemDetails.postagePaidCurrency"),
            indemnityAmount: getInput("itemDetails.indemnityAmount"),
            indemnityAmountCurrency: getInput("itemDetails.indemnityAmountCurrency"),
            podRequired: getInputByName("itemDetails.podRequired"),

            addresseeName: getInput("addresseeDetails.addresseeName"),
            addresseeStreet: getInput("addresseeDetails.addresseeStreet"),
            addresesePostcode: getInput("addresseeDetails.addresseePostcode"),
            addresseeCity: getInput("addresseeDetails.addresseeCity"),
            addresseeTelephone: getInput("addresseeDetails.addresseeTelephone"),
            addresseeEmail: getInput("addresseeDetails.addresseeEmail"),

            senderName: getInput("senderDetails.senderName"),
            senderStreet: getInput("senderDetails.senderStreet"),
            senderPostcode: getInput("senderDetails.senderPostcode"),
            senderCity: getInput("senderDetails.senderCity"),
            senderTelephone: getInput("senderDetails.senderTelephone"),
            senderEmail: getInput("senderDetails.senderEmail"),
        };

        const elementPromises = await Promise.allSettled(
            Object.entries(elements).map(([key, promise]) => Promise.resolve(promise).then((el) => [key, el] as const)),
        );

        const elementsNotFound = elementPromises
            .filter((p) => p.status === "rejected" || !p.value[1])
            .map((p) => (p.status === "rejected" ? p.reason : p.value[0]));

        if (elementsNotFound.length > 0) {
            console.log("elements not found:", elementsNotFound);
        }
        const thisForm = Object.fromEntries(
            elementPromises.filter((p) => p.status === "fulfilled").map((p) => [p.value[0], p.value[1]] as const),
        ) as { [K in keyof typeof elements]: HTMLInputElement | null };

        fillBlankInputs([
            thisForm.physicalDescription,
            thisForm.destinationPostcode,
            thisForm.addresseeName,
            thisForm.addresseeStreet,
            thisForm.addresesePostcode,
            thisForm.addresseeCity,
            thisForm.senderName,
            thisForm.senderStreet,
            thisForm.senderPostcode,
            thisForm.senderCity,
        ]);

        if (thisForm.itemWeight && !thisForm.itemWeight.value) {
            thisForm.itemWeight.value = "0.00";
        }
        if (thisForm.itemValue && thisForm.itemValueCurrency?.value !== "SDR") {
            ExchangeRateUtil.injectConvertedValue(thisForm.itemValue, thisForm.itemValueCurrency!);
        }
        if (thisForm.postagePaid && thisForm.postagePaidCurrency?.value !== "SDR") {
            ExchangeRateUtil.injectConvertedValue(thisForm.postagePaid, thisForm.postagePaidCurrency!);
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
        if (thisForm.podRequired && thisForm.podRequired.checked === false) {
            thisForm.podRequired.parentElement?.click();
        }
        if (requestLevel !== "L1Q") {
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
            if (thisForm.addresesePostcode) {
                NewGcssInjectUtil.SwitchValue(thisForm.addresesePostcode, postElement.AddresseeZipcode);
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

        InjectUtil.wait(1500).then(() => {
            hideLoadingMask();
        });
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
        InjectUtil.wait(5000).then(() => {
            mask.style.opacity = "0";
        });
    }
    function hideLoadingMask() {
        const mask = injectLoadingMask();
        if (mask) {
            mask.style.opacity = "0";
        }
    }

    function fillBlankInputs(inputs: (HTMLInputElement | null)[]) {
        inputs.forEach((input) => {
            if (input && !input.value) {
                input.value = "-";
            }
        });
    }
    function getInputByName(name: string) {
        return document.querySelector<HTMLInputElement>(`input[name='${name}']`);
    }
    function getInput(name: string) {
        return InjectUtil.TryQuerySelectFor<HTMLInputElement>(`input[aria-labelledby='${name}']`, 10, 200);
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
                        `${input.getAttribute("aria-labelledby")} Option with text='${optionText}' found after ${i + 1} trial(s)`,
                    );
                    resolve(foundOption);
                    return;
                }
                input.value = optionText;
                simulateSelectClick(input);
                await InjectUtil.wait(waitTime);
            }
            console.log(
                `${input.getAttribute("aria-labelledby")} Auto-complete option with text='${optionText}' not found after waiting ${(maxTrial * waitTime) / 1000} second`,
            );
            resolve(null);
        });
        if (option) {
            option.click();
            return;
        }
    }

    function findPostElement(item_id: string): Promise<PostElement> {
        return sendRequest<PostElement>(new MSG(COMMANDS.FETCH_POST_ELEMENT, item_id));
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
        static async injectConvertedValue(input: HTMLInputElement, currency: HTMLInputElement) {
            const sdrValue = this.calculateSDR(input.value, currency.value);
            const oldValue = input.value;
            const oldCurrency = currency.value;
            const inputLabel = input.getAttribute("aria-labelledby");
            const currencyLabel = currency.getAttribute("aria-labelledby");
            NewGcssInjectUtil.SwitchValueForCurrency(input, currency, sdrValue);

            // Retry setting value until it sticks
            for (let i = 0; i < 5; i++) {
                input.value = sdrValue;
                await InjectUtil.wait(400);
                if (input.value === sdrValue) break;
            }
            await selectAutoCompleteOption(currency, "SDR");

            if (!document.querySelector("#IMIC-" + inputLabel?.replaceAll(".", "-"))) {
                console.log("Tooltip element not found for input:", inputLabel);
                await InjectUtil.wait(1200);
                const [newInput, newCurrency] = await Promise.all([getInput(inputLabel!), getInput(currencyLabel!)]);
                this.injectConvertedValue(newInput!, newCurrency!);
                return;
            }

            // Handle value reversion on request type change
            waitUntilRequestTypeChanged().then(async () => {
                ShowLoadingMask();
                // const valueWasReverted = input.value === oldValue;
                // if (!valueWasReverted) return;

                selectAutoCompleteOption(currency, oldCurrency);
                if (inputLabel === "itemDetails.postagePaid") {
                    await InjectUtil.wait(1700);
                    console.log("Postage paid value reverted, re-injecting converted value...");
                    const [newPostageInput, newCurrency] = await Promise.all([
                        getInput("itemDetails.postagePaid"),
                        getInput("itemDetails.postagePaidCurrency"),
                    ]);
                    this.injectConvertedValue(newPostageInput!, newCurrency!);
                }
            });
        }
    }
})();
