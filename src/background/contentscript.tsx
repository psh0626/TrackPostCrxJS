import { Msg, COMMANDS } from "../lib/Message";
import { PostElement } from "../lib/PostUtil";
import InjectUtil from "./injectDOM/InjectUtil";
import { IcareAPI } from "./GetUnreadReplies/IcareReplies";
import { GlobalTimer } from "./GetUnreadReplies/Timer";

(() => {

  function getCSRFToken(): string | null {
    const csrfMetaTag = document.querySelector("head meta[name=csrf-token]") as HTMLMetaElement;
    return csrfMetaTag ? csrfMetaTag.content : null;
  }
  let csrfToken = getCSRFToken();
  if (csrfToken) {
    console.log("CSRF Token found:", csrfToken);
    // You can now use the CSRF token for your requests or initialization logic here
  } else {
    console.log("CSRF Token not found");
  }

  window.addEventListener("load", main, false);

  console.log("Content script loaded at: " + document.readyState);
  if (document.readyState === "complete") main();

  let post_element: PostElement;

  async function main() {
    console.log("Content script loaded");

    const GCSS_URL = "https://gcss.ipc.be";
    const ICARE_URL = "https://icare.post";

    const currentURL = new URL(document.URL);
    if (currentURL.origin === GCSS_URL) {
      if (currentURL.pathname.includes("/create/")) {
        const item_id: string = document.querySelector(".value")?.textContent?.trim() ?? "";

        if (!item_id) {
          console.log("Cannot find item_id in document classname 'value'");
          return;
        }
        if (item_id.slice(-2) !== "KR") {
          console.log("item id is invalid to fetch PostElement (must end with KR)");
          return;
        }

        post_element = await FindPostElement(item_id);

        if (!post_element.ItemTracked) {
          console.log(`Item does not exist ${item_id}`);
          return;
        }
        console.log(post_element);
        injectGcss(post_element);
        console.log("Dom Injected");
      }
    } else if (currentURL.origin === ICARE_URL) {
      if(!GlobalTimer.IsRunning){
        console.log("finding user id..");
        
        let user_id: string = "";
        const home = document.querySelector("body > div.content-wrapper > main > div > div.row.row-wrap.dashboard-content > div:nth-child(3) > div > div > div:nth-child(1) > div > table > tbody > tr:nth-child(1) > td:nth-child(1) > a")?.getAttribute("href");
        if(home){
          const param = new URLSearchParams(home);
          user_id = param.get("responsibleUser")!;
        }else{
          const me_option = document.querySelector("select[name='responsibleUser'] > option[data-select2-id='19']")
          if(me_option){
            user_id = me_option.getAttribute("value")!;
          }
        }
        if(user_id){
          console.log("user id found:", user_id);
          IcareAPI.UserId = user_id;
          if (csrfToken) {
            console.log("fetching replies with found csrf:", csrfToken, "\nUserID: ", IcareAPI.UserId);
            
            await IcareAPI.FetchUnreadReplies(csrfToken); 
          }else{
            console.log("csrf forged and sending request. csrf: nA1tQy921DGPmaL45z7Bq/W7B3qBICZFO/WB1b189ylvEyVW8qh8");
            await IcareAPI.FetchUnreadReplies("nA1tQy921DGPmaL45z7Bq/W7B3qBICZFO/WB1b189ylvEyVW8qh8");
          }
        }
      }else{
        console.log("timer is already on");
        
      }
      const param_action = currentURL.searchParams.get("action");
      if (param_action && param_action === "new") {
        const item_id = currentURL.searchParams.get("trackingId")?.toUpperCase();

        if (item_id?.slice(-2) !== "KR") {
          console.log("item id is invalid to fetch PostElement (must end with KR)");
          return;
        }

        post_element = await FindPostElement(item_id);

        if (!post_element.ItemTracked) {
          console.log(`Item does not exist ${item_id}`);
          return;
        }
        console.log(post_element);
        let port = chrome.runtime.connect();
        port.onMessage.addListener((message: Msg) => {
          console.log("message received: ", message);
          if (message.Command === COMMANDS.WEB_REQUEST_COMPLETE) {
            setTimeout(() => InjectIcare(post_element), 600);
            port.disconnect();
          }
        });
        port.onDisconnect.addListener((p) => {
          port.disconnect();
        });
      }
    }
  }

  function getElement<T>(cssString: string): T {
    return document.querySelector(cssString) as T;
  }

  const injectGcss = (post_element: PostElement) => {
    const getSelect = (id: string): HTMLSelectElement => {
      return getElement<HTMLSelectElement>(`#${id}`);
    };
    const getInput = (id: string): HTMLInputElement => {
      return getElement<HTMLInputElement>(`#${id}`);
    };

    const dom = {
      item_type: getSelect("txt_contentType"),
      item_contents: getInput("txt_contents"),
      item_value: getInput("txt_itemValue"),
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
    };
    dom.item_type.value = "Other/various";
    dom.item_value_currency.value = "3"; // SDR
    dom.postage_paid_currency.value = "3"; // SDR
    dom.indemnity_amount_currency.value = "3"; // SDR
    dom.pod_required_no.checked = true;
    InjectUtil.GcssSwitchValue(dom.item_contents, post_element.Contents);

    const calc_item_value = Math.round((parseFloat(dom.item_value.value) * 1400) / 1749);
    const calc_postage_paid = Math.round(parseFloat(dom.postage_paid.value) / 1749);
    const calc_indemnity_amount = calc_item_value + calc_postage_paid;
    InjectUtil.GcssSwitchValue(dom.item_value, calc_item_value.toString());
    InjectUtil.GcssSwitchValue(dom.postage_paid, calc_postage_paid.toString());
    InjectUtil.GcssSwitchValue(dom.indemnity_amount, calc_indemnity_amount.toString());

    InjectUtil.GcssSwitchValue(dom.addr_name, post_element.AddresseeName, true);
    InjectUtil.GcssSwitchValue(dom.addr_street, post_element.AddresseeAddress);
    InjectUtil.GcssSwitchValue(dom.addr_phone, post_element.AddresseePhone);
    if (dom.addr_email.value.search(String.raw`;`) !== -1 && dom.addr_email.value.length > 1) {
      InjectUtil.GcssSwitchValue(dom.addr_email, dom.addr_email.value.toLowerCase().replace(";", "@"));
    }
    InjectUtil.GcssSwitchValue(dom.addr_postcode, post_element.AddresseeZipcode);

    InjectUtil.GcssSwitchValue(dom.sndr_name, post_element.SenderName, true);
    InjectUtil.GcssSwitchValue(dom.sndr_street, post_element.SenderAddress);
    InjectUtil.GcssSwitchValue(dom.sndr_phone, post_element.SenderPhone);

    console.log("dom injected");
  };

  const InjectIcare = (post_element: PostElement) => {
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
      item_type: GetSelect("CI1_field81"), // 15: books 17: clothes 18: cosmetics 21: documents 24: food 39: other
      item_desc: GetInput("CI1_field76"),
    };

    SetSelect(dom.inquirer, "4");
    SetSelect(dom.item_categ, "13");
    SetSelect(dom.item_type, "39");

    InjectUtil.IcareSwitchValue(dom.sndr_name, post_element.SenderName);
    InjectUtil.IcareSwitchValue(dom.sndr_street, post_element.SenderAddress);
    InjectUtil.IcareSwitchValue(dom.sndr_phone, post_element.SenderPhone);

    dom.sndr_city.value = ".";
    dom.addr_city.value = ".";

    InjectUtil.IcareSwitchValue(dom.addr_name, post_element.AddresseeName);
    InjectUtil.IcareSwitchValue(dom.addr_phone, post_element.AddresseePhone);
    InjectUtil.IcareSwitchValue(dom.addr_street, post_element.AddresseeAddress);
    InjectUtil.IcareSwitchValue(dom.addr_zipcode, post_element.AddresseeZipcode);
    InjectUtil.IcareSwitchValue(dom.item_desc, post_element.Contents);

    if (dom.addr_email.value.search(`;`) !== -1 && dom.addr_email.value.length > 1) {
      InjectUtil.IcareSwitchValue(dom.addr_email, dom.addr_email.value.toLowerCase().replace(";", "@"));
    }
    console.log("Dom Injected");
  };

  async function SendCommand(message: Msg): Promise<string> {
    console.log("sending message:", message);
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response);
        console.log("message received:", response);
      });
    });
  }
  async function FindPostElement(item_id: string): Promise<PostElement> {
    const raw_post_element: string = await SendCommand(new Msg(COMMANDS.FETCH_POST_ELEMENT, item_id));

    return new PostElement(JSON.parse(raw_post_element));
  }
})();
