import { IMICSettings } from "../lib/IMICSettings";
import { COMMANDS, MSG, sendRequest } from "../lib/Message";
import { PostElement } from "../lib/PostUtil";
import InjectUtil from "./inject-dom/injectUtil";
import OldGcssInjectUtil from "./inject-dom/oldGcssInjectUtil";
import { GcssAPI } from "./pending-replies/gcssReplies";

(async () => {
    const settings = new IMICSettings();
    await settings.requestLoad();
    GcssAPI.settings = settings;

    console.log("Content script loaded at: " + document.readyState);

    chrome.runtime.onMessage.addListener((message: MSG) => {
        switch (message.Command) {
            case COMMANDS.FETCH_REQUEST:
                void GcssAPI.FetchReplies();
                break;
            case COMMANDS.SETTINGS_CHANGED:
                void (async () => {
                    await settings.requestLoad();
                    GcssAPI.settings = settings;
                    console.log("Settings Reloaded", settings, GcssAPI.settings);
                })();
                break;
        }
    });

    await main();
    async function main() {
        console.log("Content script loaded");

        const GCSS_URL = "https://gcss.ipc.be";
        const currentURL = new URL(document.URL);

        if (currentURL.origin !== GCSS_URL) return;

        document.head.querySelector("link[rel='stylesheet']")?.removeAttribute("media");
        window.addEventListener("hashchange", (e) => {
            if (e.newURL.includes("/query")) {
                OldGcssInjectUtil.InjectQueryInput();
            }
        });
        if (currentURL.toString().includes("/query")) {
            OldGcssInjectUtil.InjectQueryInput();
        }

        if (settings.GcssUnreadReplies) GcssAPI.FetchReplies();

        if (currentURL.pathname.includes("/product-view") || currentURL.pathname.includes("/singleItemTracking")) {
            OldGcssInjectUtil.InjectIdSearchInput();
            if (currentURL.pathname.includes("/multiview/")) {
                const checkErr = () => document.querySelector("#validationErrors")?.textContent?.trim() ?? "";
                for (let i = 0; i < 30; i++) {
                    if (checkErr().includes("verify")) {
                        const itemId = currentURL.searchParams.get("item");
                        console.log("Detected verify error, redirecting to correct view");
                        window.location.href = currentURL.href.replace("/multiview/", `/${getMailService(itemId)}/`);
                        break;
                    }
                    await InjectUtil.wait(100);
                }
            }
        } else if (currentURL.pathname.includes("/create/") || currentURL.pathname.includes("/reactivate/")) {
            const item_id: string = document.querySelector(".value")?.textContent?.trim() ?? "";
            if (!item_id) {
                console.log("Cannot find item_id in document classname 'value'");
                return;
            }
            if (currentURL.pathname.includes("/create/") && currentURL.pathname.includes("/level1/")) {
                const urlService = currentURL.pathname.split("gcss/")[1].split("/level")[0];
                const correctService = getMailService(item_id);
                if (urlService !== correctService) {
                    const saidYes = confirm(`
                        등기번호: ${item_id}
                        현재 페이지의 서비스: ${urlService === "UPU" ? "Parcels" : urlService}
                        추천 서비스: ${correctService === "UPU" ? "Parcels" : correctService}
                        \n등기번호와 서비스가 일치하지 않습니다. 해당 등기번호에 맞는 서비스 페이지로 이동하시겠습니까?`);
                    if (saidYes) {
                        document.querySelector<HTMLInputElement>("#btnCancel")?.click();
                        setTimeout(() => {
                            window.close();
                        }, 2000);
                        const newURL = currentURL.href.replace(`/${urlService}/`, `/${correctService}/`);
                        window.open(newURL, "mywindow")?.focus();
                    }
                }
            }

            if (item_id.slice(-2) !== "KR") {
                console.log("item id is invalid to fetch PostElement (must end with KR)");
                return;
            }

            const post_element = await findPostElement(item_id);
            if (!post_element.ItemTracked) {
                console.log(`Item does not exist ${item_id}`);
                return;
            }

            if (currentURL.pathname.includes("/level1/")) {
                console.log(post_element);
                injectGcss(post_element);
                console.log("Dom Injected");
            } else {
                injectGcssL2(post_element);
            }
        } else if (currentURL.pathname.includes("/reply/")) {
            document.oncopy = (e) => {
                const selection = window.getSelection();
                if (selection) {
                    const selectedText = selection.toString();
                    if (selectedText) {
                        e.clipboardData?.setData("text/plain", selectedText);
                        console.log("Copied text:", selectedText);
                        e.preventDefault();
                    }
                }
            };
        }
    }

    async function findPostElement(item_id: string): Promise<PostElement> {
        return await sendRequest<PostElement>(new MSG(COMMANDS.FETCH_POST_ELEMENT, item_id));
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

    function getElement<T>(cssString: string): T {
        return document.querySelector(cssString) as T;
    }

    function setItemValueCurrency(
        item_value_currency: HTMLSelectElement,
        item_value: HTMLInputElement,
        is_registered: boolean,
    ) {
        // Item value
        if (item_value_currency.value !== "3") {
            // 이미 SDR이 지정되지 않은 경우에만
            if (item_value.value !== "") {
                const calc_item_value = Math.ceil(
                    (parseFloat(item_value.value) * getExchangeRate(item_value_currency.value)) / 1749,
                );
                OldGcssInjectUtil.SwitchValueForCurrency(item_value, item_value_currency, calc_item_value.toString());
            } else if (is_registered) {
                item_value.value = "0";
            }
            item_value_currency.value = "3"; // SDR
        }
    }

    function setPostagePaidCurrency(
        postage_paid_currency: HTMLSelectElement,
        postage_paid: HTMLInputElement,
        is_registered: boolean,
    ) {
        // Postage paid
        if (postage_paid_currency.value !== "3") {
            // 이미 SDR이 지정되지 않은 경우에만
            if (postage_paid.value !== "") {
                const calc_postage_paid = Math.ceil(parseFloat(postage_paid.value) / 1749);
                OldGcssInjectUtil.SwitchValueForCurrency(
                    postage_paid,
                    postage_paid_currency,
                    calc_postage_paid.toString(),
                );
            } else if (is_registered) {
                postage_paid.value = "30";
            }
            postage_paid_currency.value = "3"; // SDR
        }
    }

    function setIndemnityCurrency(
        indemnity_amount_currency: HTMLSelectElement,
        indemnity_amount: HTMLInputElement,
        item_value: HTMLInputElement,
        postage_paid: HTMLInputElement,
    ) {
        // Indemnity amount
        if (indemnity_amount_currency.value !== "3") {
            // 이미 SDR이 지정되지 않은 경우에만
            if (item_value.value !== "" || postage_paid.value !== "") {
                const calc_indemnity_amount = parseInt(item_value.value) + parseInt(postage_paid.value);
                OldGcssInjectUtil.SwitchValueForCurrency(
                    indemnity_amount,
                    indemnity_amount_currency,
                    calc_indemnity_amount.toString(),
                );
            }
            indemnity_amount_currency.value = "3"; // SDR
        }
    }

    async function injectGcssL2(post_element: PostElement) {
        await InjectUtil.TryQuerySelectFor("#txt_itemType");

        const getSelect = (id: string): HTMLSelectElement => {
            return getElement<HTMLSelectElement>(`#${id}`);
        };
        const getInput = (id: string): HTMLInputElement => {
            return getElement<HTMLInputElement>(`#${id}`);
        };

        const dom = {
            item_type: getSelect("txt_itemType"),
            content_type: getSelect("txt_contentType"),
            item_value: getInput("txt_itemValue"),
            postage_paid: getInput("txt_postagePaid"),
            indemnity_amount: getInput("txt_indemnityAmount"),
            item_value_currency: getSelect("txt_itemValueCurrency"),
            postage_paid_currency: getSelect("txt_postagePaidCurrency"),
            indemnity_amount_currency: getSelect("txt_indemnityAmountCurrency"),
            pod_required_yes: getInput("txt_podRequired_1"),
            pod_required_no: getInput("txt_podRequired_2"),
            item_id: document.querySelector(".messageRouting .value")?.textContent?.trim() ?? "",
        };

        const is_reg = dom.item_id.startsWith("L") || dom.item_id.startsWith("R");
        if (is_reg) {
            if (dom.item_type.value === "") dom.item_type.value = "Packet";
        }

        // Content type
        if (dom.content_type.value === "") {
            dom.content_type.value = "Other/various";
        }
        setItemValueCurrency(dom.item_value_currency, dom.item_value, is_reg);
        setPostagePaidCurrency(dom.postage_paid_currency, dom.postage_paid, is_reg);
        setIndemnityCurrency(dom.indemnity_amount_currency, dom.indemnity_amount, dom.item_value, dom.postage_paid);

        if (!dom.pod_required_no.checked && !dom.pod_required_yes.checked) {
            dom.pod_required_yes.checked = true;
        }
    }

    async function injectGcss(post_element: PostElement | null) {
        await InjectUtil.TryQuerySelectFor("#txt_physicalDescription");

        const getSelect = (id: string): HTMLSelectElement => {
            return getElement<HTMLSelectElement>(`#${id}`);
        };
        const getInput = (id: string): HTMLInputElement => {
            return getElement<HTMLInputElement>(`#${id}`);
        };

        const dom = {
            physical_desc: getInput("txt_physicalDescription"),
            dest_postcode: getInput("txt_destinationPostcode"),
            item_type: getSelect("txt_itemType"),
            posting_date: getInput("txt_dateOfPosting"),
            content_type: getSelect("txt_contentType"),
            item_contents: getInput("txt_contents"),
            item_value: getInput("txt_itemValue"),
            item_weight: getInput("txt_itemWeight"),
            postage_paid: getInput("txt_postagePaid"),
            indemnity_amount: getInput("txt_indemnityAmount"),
            item_value_currency: getSelect("txt_itemValueCurrency"),
            postage_paid_currency: getSelect("txt_postagePaidCurrency"),
            indemnity_amount_currency: getSelect("txt_indemnityAmountCurrency"),
            pod_required_yes: getInput("txt_podRequired_1"),
            pod_required_no: getInput("txt_podRequired_2"),
            addr_name: getInput("txt_addresseeName"),
            addr_postcode: getInput("txt_addresseePostcode"),
            addr_street: getInput("txt_addresseeStreet"),
            addr_email: getInput("txt_addresseeEmail"),
            addr_city: getInput("txt_addresseeCity"),
            addr_phone: getInput("txt_addresseeTelephone"),
            sndr_name: getInput("txt_senderName"),
            sndr_street: getInput("txt_senderStreet"),
            sndr_city: getInput("txt_senderCity"),
            sndr_phone: getInput("txt_senderTelephone"),
            sndr_postcode: getInput("txt_senderPostcode"),
            item_id: document.querySelector(".messageRouting .value")?.textContent?.trim() ?? "",
        };

        if (dom.item_weight.value === "") {
            dom.item_weight.value = "0";
        }

        // Content type
        dom.content_type.value = "Other/various";

        // 등기 Packet 입력
        const is_reg = dom.item_id.startsWith("L") || dom.item_id.startsWith("R");
        if (is_reg) {
            dom.physical_desc.value = "Packet";
            dom.item_type.value = "Packet";
        }
        setItemValueCurrency(dom.item_value_currency, dom.item_value, is_reg);
        setPostagePaidCurrency(dom.postage_paid_currency, dom.postage_paid, is_reg);
        setIndemnityCurrency(dom.indemnity_amount_currency, dom.indemnity_amount, dom.item_value, dom.postage_paid);

        // POD required
        dom.pod_required_yes.checked = true;

        if (dom.addr_email.value.length > 1) {
            const raw_email = dom.addr_email.value;
            const fixed_email = replaceLast(raw_email.toLowerCase(), ";", "@");
            OldGcssInjectUtil.SwitchValue(dom.addr_email, fixed_email);
        }

        if (dom.sndr_city.value === "") dom.sndr_city.value = ".";
        if (dom.sndr_postcode.value === "") dom.sndr_postcode.value = ".";
        if (dom.addr_city.value === "") dom.addr_city.value = ".";

        if (!post_element) {
            console.log("Post element is null, skipping injection");
            return;
        }

        if (dom.dest_postcode.value === "") dom.dest_postcode.value = post_element.AddresseeZipcode;

        // Date of Posting 빈 칸일 경우 입력
        if (dom.posting_date.value === "") {
            dom.posting_date.value = `${post_element.ApplicationDate.substring(6)}/${post_element.ApplicationDate.substring(4, 6)}/${post_element.ApplicationDate.substring(0, 4)}`;
        }

        // Contents
        OldGcssInjectUtil.SwitchValue(dom.item_contents, post_element.Contents);

        // Addressee
        OldGcssInjectUtil.SwitchValue(dom.addr_name, post_element.AddresseeName, dom.addr_name.value.length !== 0);
        OldGcssInjectUtil.SwitchValue(dom.addr_street, post_element.AddresseeAddress);
        OldGcssInjectUtil.SwitchValue(dom.addr_phone, post_element.AddresseePhone);
        OldGcssInjectUtil.SwitchValue(dom.addr_postcode, post_element.AddresseeZipcode);

        // Sender
        OldGcssInjectUtil.SwitchValue(dom.sndr_name, post_element.SenderName, dom.sndr_name.value.length !== 0);
        OldGcssInjectUtil.SwitchValue(dom.sndr_street, post_element.SenderAddress);
        OldGcssInjectUtil.SwitchValue(dom.sndr_phone, post_element.SenderPhone);

        console.log("dom injected");
    }

    function replaceLast(originalString: string, searchString: string, replacementString: string): string {
        const lastIndex = originalString.lastIndexOf(searchString);

        if (lastIndex === -1) {
            return originalString; // Substring not found, return original string
        }

        return (
            originalString.slice(0, lastIndex) +
            replacementString +
            originalString.slice(lastIndex + searchString.length)
        );
    }
    function getMailService(itemId: string | null) {
        switch (itemId?.slice(0, 1)) {
            case "E":
                return "EMS";
            case "L":
                return "EXPRES";
            case "R":
                return "REG";
            case "C":
                return "UPU";
            case "V":
                return "INS";
            default:
                alert("Unknown service for item id " + itemId + ", redirecting to EMS view");
                return "EMS";
        }
    }
})();
