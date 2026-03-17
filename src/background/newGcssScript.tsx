import { COMMANDS, Msg, SendRequest } from "../lib/Message";
import { IMICSettings } from "../lib/OptionElement";
import { PostElement } from "../lib/PostUtil";
import InjectUtil from "./injectDOM/InjectUtil";

(async () => {
    console.log("Content script loaded at: " + document.readyState);

    const settings = new IMICSettings();
    await settings.RequestLoad();

    let lastPostElement: PostElement | null = null;

    (window as any).navigation.addEventListener("navigate", async (e: any) => {
        const url = new URL(e.destination.url);
        console.log("Navigated to:", url.href);

        const paramURL = new URL(e.destination.url.replace("/#", ""));
        console.log("url with params:", paramURL);

        if (paramURL.searchParams.get("form") === "L1Q") {
            console.log("L1Q form detected");

            const itemId = paramURL.pathname.replace("/items/", "");

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
                return;
            }

            lastPostElement = postElement;

            await setSelect("itemDetails.contentType", "OTHER_VARIOUS");
            const currencyInput = getInput("itemDetails.itemValueCurrency");
            const itemValueInput = getInput("itemDetails.itemValue");
            
            if (!currencyInput || !itemValueInput) {
                console.log("Currency or item value input not found");
                return;
            }

            itemValueInput.value = Math.round(
                (parseFloat(itemValueInput.value) * getExchangeRate(currencyInput.value)) / 1749).toString();
        }
    });

    function getInput(name: string) {
        return document.querySelector<HTMLInputElement>(`input[aria-labelledby='${name}']`);
    }
    function getSelect(name: string) {
        return InjectUtil.TryQuerySelectFor<HTMLDivElement>(`div[aria-labelledby='${name}']`);
    }

    async function setSelect(name: string, value: string) {
        const select = await getSelect(name);
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
        let rate = 1500; // USD

        switch (currency_value) {
            case "2": // EUR
                rate = 1700;
                break;
            case "89": // KRW
                rate = 1;
                break;
            case "111": // GBP
                rate = 2000;
                break;
            case "87": // JPY
                rate = 1000;
                break;
            case "80": // CNY
                rate = 200;
                break;
        }
        return rate;
    }

    function findPostElement(item_id: string): Promise<PostElement> {
        return SendRequest<PostElement>(new Msg(COMMANDS.FETCH_POST_ELEMENT, item_id));
    }
})();
