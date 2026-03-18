import { IMICSettings } from "../lib/IMICSettings";
import { COMMANDS, MSG, sendRequest } from "../lib/Message";
import { PostElement } from "../lib/PostUtil";
import InjectUtil from "./inject-dom/injectUtil";
import NewGcssInjectUtil from "./inject-dom/newGcssInjectUtil";

(async () => {
    console.log("Content script loaded at: " + document.readyState);

    const settings = new IMICSettings();
    await settings.requestLoad();

    let lastPostElement: PostElement | null = null;
    let isInjecting = false;

    (window as any).navigation.addEventListener("navigate", async (e: any) => {
        const url = new URL(e.destination.url);
        console.log("Navigated to:", url.href);

        const paramURL = new URL(url.href.replace("/#", ""));
        console.log("url with params:", paramURL);

        NewGcssInjectUtil.InjectIdSearchInput();
        await injectBasedOnURL(paramURL);
    });
    (async function Main() {
        NewGcssInjectUtil.InjectIdSearchInput();
        const paramURL = new URL(location.href.replace("/#", ""));
        console.log("location url with params:", paramURL);

        await injectBasedOnURL(paramURL);
    })();

    async function injectBasedOnURL(url: URL) {
        if (isInjecting) return;
        isInjecting = true;
        if (checkURLIfRequesting(url)) {
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

            await InjectRequestForm(postElement);
        }
        isInjecting = false;
    }
    function checkURLIfRequesting(url: URL) {
        const formParam = url.searchParams.get("form")!;
        if (/(L\d\d?Q)/.test(formParam)) {
            console.log("Request form detected:", formParam);
            return true;
        }
        return false;
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

    async function waitUntilRequestTypeSelected() {
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
    async function InjectRequestForm(postElement: PostElement | null) {
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

        const elementsNotFound = elementPromises.filter((p) => p.status === "rejected" || !p.value[1]);

        if (elementsNotFound.length > 0) {
            console.warn("elements not found:", elementsNotFound);
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
        }
        if (thisForm.podRequired && thisForm.podRequired.checked === false) {
            thisForm.podRequired.parentElement?.click();
        }
        if (postElement) {
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
        return document.querySelector<HTMLInputElement>(`input[aria-labelledby='${name}']`);
    }
    function tryGetSelect(name: string) {
        return InjectUtil.TryQuerySelectFor<HTMLDivElement>(`div[aria-labelledby='${name}']`);
    }
    function simulateSelectClick(select: HTMLDivElement) {
        select.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    }
    async function setSelect(name: string, value: string) {
        const select = await tryGetSelect(name);
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
        static injectConvertedValue(input: HTMLInputElement, currency: HTMLInputElement) {
            const sdrValue = this.calculateSDR(input.value, currency.value);
            NewGcssInjectUtil.SwitchValueForCurrency(input, currency, sdrValue);
        }
    }
})();
