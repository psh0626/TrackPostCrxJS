import { IMICSettings } from "../lib/IMICSettings";
import { COMMANDS, MSG, sendRequest } from "../lib/message";
import { PostElement } from "../lib/PostUtil";
import InjectUtil from "./inject-dom/injectUtil";
import NewGcssInjectUtil from "./inject-dom/newGcssInjectUtil";

(async () => {
    console.log("Content script loaded at: " + document.readyState);

    const settings = new IMICSettings();
    await settings.requestLoad();

    let lastPostElement: PostElement | null = null;

    (window as any).navigation.addEventListener("navigate", async (e: any) => {
        const url = new URL(e.destination.url);
        console.log("Navigated to:", url.href);

        const paramURL = new URL(url.href.replace("/#", ""));
        console.log("url with params:", paramURL);

        await injectBasedOnURL(paramURL);
    });
    (async function Main() {
        await NewGcssInjectUtil.InjectIdSearchInput();
        const paramURL = new URL(location.href.replace("/#", ""));
        console.log("location url with params:", paramURL);

        await injectBasedOnURL(paramURL);
    })();

    async function injectBasedOnURL(url: URL) {
        if (checkURLIfRequesting(url)) {
            const itemId = url.pathname.replace("/items/", "");
            let promises = await Promise.allSettled([fetchPostElement(itemId), waitUntilRequestTypeSelected()]);

            const postElement = promises[0].status === "fulfilled" ? promises[0].value : await fetchPostElement(itemId);

            if (!postElement) {
                console.error("Failed to fetch post element for item ID:", itemId);
            }

            await InjectRequestForm(postElement);
        }
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
            "input[aria-labelledby='requestType']`",
        );
        if (!requestType) {
            console.log("Request type input not found");
            return;
        }

        do {
            await InjectUtil.wait(500);
        } while (!requestType.value);
    }
    async function InjectRequestForm(postElement: PostElement | null) {
        await setSelect("itemDetails.contentType", "OTHER_VARIOUS");
        const currencyInput = getInput("itemDetails.itemValueCurrency");
        const itemValueInput = getInput("itemDetails.itemValue");

        if (!currencyInput || !itemValueInput) {
            console.log("Currency or item value input not found");
            return;
        }
        const rateSDR = 1749;
        const calcValue = Math.round(
            (parseFloat(itemValueInput.value) * getExchangeRate(currencyInput.value)) / rateSDR,
        ).toString();
        NewGcssInjectUtil.SwitchValueForCurrency(itemValueInput, currencyInput, calcValue);
    }
    function getInput(name: string) {
        return document.querySelector<HTMLInputElement>(`input[aria-labelledby='${name}']`);
    }
    function tryGetSelect(name: string) {
        return InjectUtil.TryQuerySelectFor<HTMLDivElement>(`div[aria-labelledby='${name}']`);
    }

    async function setSelect(name: string, value: string) {
        const select = await tryGetSelect(name);
        if (!select) {
            console.log(`Select element with aria-labelledby='${name}' not found`);
            return;
        }
        select.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        const liValue = await InjectUtil.TryQuerySelectFor<HTMLLIElement>(`li[data-value='${value}']`, 10, 100);
        if (!liValue) {
            console.log(`Option with data-value='${value}' not found for select '${name}'`);
            return;
        }
        liValue.click();
    }

    function setItemValueCurrency(
        valueCurrency: HTMLInputElement,
        itemValue: HTMLInputElement,
        is_registered: boolean,
    ) {
        // Item value
        if (valueCurrency.value !== "SDR") {
            // 이미 SDR이 지정되지 않은 경우에만
            if (itemValue.value !== "") {
                const calc_item_value = Math.round(
                    (parseFloat(itemValue.value) * getExchangeRate(valueCurrency.value)) / 1749,
                );
                // InjectUtil.GcssSwitchValueForCurrency(itemValue, valueCurrency, calc_item_value.toString());
            } else if (is_registered) {
                itemValue.value = "0";
            }
            valueCurrency.value = "3"; // SDR
        }
    }

    function getExchangeRate(currency_value: string) {
        let rate = 1600; // USD

        switch (currency_value) {
            case "EUR": // EUR
                rate = 1900;
                break;
            case "KRW": // KRW
                rate = 1;
                break;
            case "GBP": // GBP
                rate = 2200;
                break;
            case "JPY": // JPY
                rate = 12;
                break;
            case "CNY": // CNY
                rate = 300;
                break;
        }
        return rate;
    }

    function findPostElement(item_id: string): Promise<PostElement> {
        return sendRequest<PostElement>(new MSG(COMMANDS.FETCH_POST_ELEMENT, item_id));
    }
})();
