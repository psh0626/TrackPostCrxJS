import { COMMANDS, Msg, SendRequest } from "../lib/Message";
import { IMICSettings } from "../lib/OptionElement";
import { PostElement } from "../lib/PostUtil";
import { IcareAPI2 } from "./GetUnreadReplies/IcareReplies";
import InjectUtil from "./injectDOM/InjectUtil";

void (async () => {
    const settings = new IMICSettings();
    await settings.RequestLoad();

    IcareAPI2.settings = settings;

    const csrfToken = "nA1tQy921DGPmaL45z7Bq/W7B3qBICZFO/WB1b189ylvEyVW8qh8";
    // let csrfToken = document.querySelector("meta[name='csrf-token']")?.getAttribute("content");
    // if (csrfToken) {
    //   console.log("CSRF Token found:", csrfToken);
    //   // You can now use the CSRF token for your requests or initialization logic here
    // } else {
    //   csrfToken = "nA1tQy921DGPmaL45z7Bq/W7B3qBICZFO/WB1b189ylvEyVW8qh8";
    //   console.log("CSRF Token not found, forged randomly", csrfToken);
    // }

    console.log("Content script loaded at: " + document.readyState);

    chrome.runtime.onMessage.addListener((message: Msg) => {
        switch (message.Command) {
            case COMMANDS.ICARE_UNREAD_REPLIES:
                console.log("IcareAPI2 fetching unread replies by tick");
                void IcareAPI2.FetchUnreadReplies(csrfToken);
                break;
            case COMMANDS.SETTINGS_CHANGED:
                void (async () => {
                    await settings.RequestLoad();
                    IcareAPI2.settings = settings;
                    console.log("Settings Reloaded", settings, IcareAPI2.settings);
                })();
                break;
        }
    });

    await main();

    async function main() {
        console.log("Content script loaded");

        const ICARE_URL = "https://icare.post";

        const currentURL = new URL(document.URL);
        if (currentURL.origin !== ICARE_URL) return;

        if (settings.IcareUnreadReplies) await IcareAPI2.FetchUnreadReplies(csrfToken!);
        const param_module = currentURL.searchParams.get("module");
        const param_action = currentURL.searchParams.get("action");
        if (param_module === "dashboard") {
            InjectUtil.InjectIcareIdSearchInput();
        } else if (param_action === "new") {
            if (currentURL.searchParams.get("module") === "notification") {
                InjectUtil.InjectIcarePersonalRemarks("NOQ");
                return;
            }
            const item_id = currentURL.searchParams.get("trackingId")?.toUpperCase();
            if (item_id?.slice(-2) !== "KR") {
                console.log("item id is invalid to fetch PostElement (must end with KR)");
                return;
            }
            const port = chrome.runtime.connect();
            let post_element = new PostElement();

            port.onMessage.addListener(async (message: Msg) => {
                console.log("message received: ", message);
                if (message.Command === COMMANDS.WEB_REQUEST_COMPLETE) {
                    InjectUtil.InjectIcarePersonalRemarks();
                    console.log(post_element);
                    if (!post_element.ItemTracked) {
                        for (let i = 0; i < 15; i++) {
                            await new Promise((res) => setTimeout(res, 200));
                            if (post_element.ItemTracked) break;
                        }
                        if (!post_element.ItemTracked) console.log(`Item does not exist ${item_id}`);
                    }
                    InjectIcare(post_element);
                    // port.disconnect();
                }
            });
            post_element = await FindPostElement(item_id!);

            // port.onDisconnect.addListener((p) => {
            //   p.disconnect();
            //   port.disconnect();
            //   console.log("PORT DISCONNECTED");
            // });
        } else if (param_action === "view") {
            if (currentURL.searchParams.get("module") === "notification") {
                //noti 도착
                InjectUtil.InjectIcarePersonalRemarks("NOP");
                return;
            }
            InjectUtil.InjectIcarePersonalRemarks("SUM");
            const dataset = (document.querySelector("div[data-tracking-id]") as HTMLDivElement).dataset;
            const item_id = dataset.trackingId ?? "";
            const remark_type = item_id.slice(-2) === "KR" ? "REQ" : "REP";
            const port = chrome.runtime.connect();
            port.onMessage.addListener((message: Msg) => {
                console.log("message received: ", message);
                if (message.Command === COMMANDS.WEB_REQUEST_COMPLETE) {
                    InjectUtil.InjectIcarePersonalRemarks(remark_type);
                    // port.disconnect();
                }
            });
            // port.onDisconnect.addListener((p) => {
            //   p.disconnect();
            //   port.disconnect();
            // });
        }
    }

    function getElement<T>(cssString: string): T {
        return document.querySelector(cssString) as T;
    }

    async function InjectIcare(post_element: PostElement) {
        await InjectUtil.TryQuerySelectFor("select[name='field89']");

        const event = new Event("change", { bubbles: true });

        const GetSelect = (name: string) => {
            return getElement<HTMLSelectElement>(`select[name="${name}"]`);
        };

        const GetInput = (name: string) => {
            return getElement<HTMLInputElement>(`input[name="${name}"]`);
        };

        const SetSelect = (select_element: HTMLSelectElement, new_value: string) => {
            select_element.value = new_value;
            select_element.dispatchEvent(event);
        }; //field89 inquirer

        const dom = {
            inquirer: GetSelect("field89"), // 4: sender 5: addressee
            sndr_name: GetInput("field17"),
            sndr_street: GetInput("field19"),
            sndr_phone: GetInput("field71"),
            sndr_city: GetInput("field79"),
            addr_name: GetInput("field21"),
            addr_street: GetInput("field23"),
            addr_zipcode: GetInput("field78"),
            addr_city: GetInput("field80"),
            addr_phone: GetInput("field72"),
            addr_email: GetInput("field74"),
            item_categ: GetSelect("field75"), // 10: documents 13: other
            item_type: GetSelect("CI1_field81"), // 15: books 17: clothes 18: cosmetics 21: documents 24: food 39: other.
            item_desc: GetInput("CI1_field76"),
        };

        SetSelect(dom.inquirer, "4");
        SetSelect(dom.item_categ, "13");
        SetSelect(dom.item_type, "39");

        dom.sndr_city.value = ".";
        dom.addr_city.value = ".";

        if (dom.addr_email.value.length > 1) {
            InjectUtil.IcareSwitchValue(dom.addr_email, dom.addr_email.value.toLowerCase().replace(";", "@"));
        }

        if (post_element.ItemTracked) {
            InjectUtil.IcareSwitchValue(dom.sndr_name, post_element.SenderName);
            InjectUtil.IcareSwitchValue(dom.sndr_street, post_element.SenderAddress);
            InjectUtil.IcareSwitchValue(dom.sndr_phone, post_element.SenderPhone);

            InjectUtil.IcareSwitchValue(dom.addr_name, post_element.AddresseeName);
            InjectUtil.IcareSwitchValue(dom.addr_phone, post_element.AddresseePhone);
            InjectUtil.IcareSwitchValue(dom.addr_street, post_element.AddresseeAddress);
            InjectUtil.IcareSwitchValue(dom.addr_zipcode, post_element.AddresseeZipcode);
            InjectUtil.IcareSwitchValue(dom.item_desc, post_element.Contents);
        }

        console.log("Dom Injected");
    }

    async function FindPostElement(item_id: string): Promise<PostElement> {
        return await SendRequest<PostElement>(new Msg(COMMANDS.FETCH_POST_ELEMENT, item_id));
    }
})();
