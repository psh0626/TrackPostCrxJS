import { Msg, COMMANDS, SendRequest } from "../lib/Message";
import { PostElement } from "../lib/PostUtil";
import InjectUtil from "./injectDOM/InjectUtil";
import { IcareAPI } from "./GetUnreadReplies/IcareReplies";
import GetIcareUserId from "../lib/GetIcareUserId";
import { GcssAPI } from "./GetUnreadReplies/GcssReplies";
import { IMICSettings } from "../lib/OptionElement";

(async () => {
  const settings = new IMICSettings();
  await settings.RequestLoad();
  GcssAPI.settings = settings;
  IcareAPI.settings = settings;

  let csrfToken = "nA1tQy921DGPmaL45z7Bq/W7B3qBICZFO/WB1b189ylvEyVW8qh8";
  // if (csrfToken) {
  //   console.log("CSRF Token found:", csrfToken);
  //   // You can now use the CSRF token for your requests or initialization logic here
  // } else {
  //   csrfToken = "nA1tQy921DGPmaL45z7Bq/W7B3qBICZFO/WB1b189ylvEyVW8qh8";
  //   console.log("CSRF Token not found, forged randomly", csrfToken);
  // }

  window.addEventListener("load", main, false);

  chrome.runtime.onMessage.addListener((message: Msg, sender, response) => {
    switch (message.Command) {
      case COMMANDS.GCSS_UNREAD_REPLIES:
        GcssAPI.FetchReplies(false);
        break;
      case COMMANDS.ICARE_UNREAD_REPLIES:
        IcareAPI.FetchUnreadReplies(csrfToken);
        break;
      case COMMANDS.SETTINGS_CHANGED:
        (async () => {
          await settings.RequestLoad();
          GcssAPI.settings = settings;
          IcareAPI.settings = settings;
          console.log("Settings Reloaded", settings, GcssAPI.settings, IcareAPI.settings);
        })();
        break;
    }
  });

  console.log("Content script loaded at: " + document.readyState);
  if (document.readyState === "complete") main();

  let post_element: PostElement;
  let icare_internal_userid = "";
  async function main() {
    console.log("Content script loaded");

    const GCSS_URL = "https://gcss.ipc.be";
    const ICARE_URL = "https://icare.post";

    const currentURL = new URL(document.URL);
    if (currentURL.origin === GCSS_URL) {
      window.addEventListener("hashchange", (e) => {
        if (e.newURL.includes("/query")) {
          setTimeout(() => {
            InjectUtil.InjectGcssQueryInput();
          }, 100);
        }
      });

      GcssAPI.FetchReplies(false);
      if (
        currentURL.pathname.includes("/create/") ||
        currentURL.pathname.includes("/reactivate/")
      ) {
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

        if (currentURL.pathname.includes("/level1/")) {
          console.log(post_element);
          injectGcss(post_element);
          console.log("Dom Injected");
        } else {
          injectGcssL2(post_element);
        }
      } else if (currentURL.toString().includes("/query")) {
        InjectUtil.InjectGcssQueryInput();
      }
    } else if (currentURL.origin === ICARE_URL) {
      (async () => {
        console.log("finding user id.."); // global timer, local storage에 user id 저장 한번만 찾으면 다시 찾을 필요 없어짐, webrequest 분석해서 csrf 계속 확인하는 건 어떰?
        icare_internal_userid = await GetIcareUserId();

        console.log("user id found:", icare_internal_userid);
        IcareAPI.UserId = icare_internal_userid;
        console.log("fetching replies with found csrf:", csrfToken, "\nUserID: ", IcareAPI.UserId);

        await IcareAPI.FetchUnreadReplies(csrfToken!);
      })();

      const param_action = currentURL.searchParams.get("action");
      if (param_action === "new") {
        if (currentURL.searchParams.get("module") === "notification") {
          InjectUtil.InjectIcarePersonalRemarks("NOQ");
          return;
        }
        const item_id = currentURL.searchParams.get("trackingId")?.toUpperCase();
        if (item_id?.slice(-2) !== "KR") {
          console.log("item id is invalid to fetch PostElement (must end with KR)");
          return;
        }

        post_element = await FindPostElement(item_id!);

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
        let port = chrome.runtime.connect();
        port.onMessage.addListener((message: Msg) => {
          console.log("message received: ", message);
          if (message.Command === COMMANDS.WEB_REQUEST_COMPLETE) {
            setTimeout(() => InjectUtil.InjectIcarePersonalRemarks(remark_type), 600);
            port.disconnect();
          }
        });
        port.onDisconnect.addListener((p) => {
          port.disconnect();
        });
      }
    }
  }

  function getExchangeRate(currency_value: string) {
    let rate = 1400; // USD

    switch (currency_value) {
      case "2": // EUR
        rate = 1600;
        break;
      case "89": // KRW
        rate = 1;
        break;
      case "111": // GBP
        rate = 1800;
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
  const injectGcssL2 = (post_element: PostElement) => {
    const getSelect = (id: string): HTMLSelectElement => {
      return getElement<HTMLSelectElement>(`#${id}`);
    };
    const getInput = (id: string): HTMLInputElement => {
      return getElement<HTMLInputElement>(`#${id}`);
    };

    const dom = {
      item_type: getSelect("txt_contentType"),
      item_value: getInput("txt_itemValue"),
      postage_paid: getInput("txt_postagePaid"),
      indemnity_amount: getInput("txt_indemnityAmount"),
      item_value_currency: getSelect("txt_itemValueCurrency"),
      postage_paid_currency: getSelect("txt_postagePaidCurrency"),
      indemnity_amount_currency: getSelect("txt_indemnityAmountCurrency"),
      pod_required_yes: getInput("txt_podRequired_1"),
      pod_required_no: getInput("txt_podRequired_2"),
    };
    if (dom.item_value_currency.value !== "3") {
      dom.item_value_currency.value = "3"; // SDR
      const calc_item_value = Math.round((parseFloat(dom.item_value.value) * 1400) / 1749);
      InjectUtil.GcssSwitchValue(dom.item_value, calc_item_value.toString());
    }
    if (dom.postage_paid_currency.value !== "3") {
      dom.postage_paid_currency.value = "3"; // SDR
      const calc_postage_paid = Math.round(parseFloat(dom.postage_paid.value) / 1749);
      InjectUtil.GcssSwitchValue(dom.postage_paid, calc_postage_paid.toString());
    }
    if (dom.indemnity_amount_currency.value !== "3") {
      dom.indemnity_amount_currency.value = "3"; // SDR
      const calc_indemnity_amount =
        parseInt(dom.item_value.value) + parseInt(dom.postage_paid.value);
      InjectUtil.GcssSwitchValue(dom.indemnity_amount, calc_indemnity_amount.toString());
    }
    if (!dom.pod_required_no.checked && !dom.pod_required_yes.checked) {
      dom.pod_required_yes.checked = true;
    }
  };

  const injectGcss = (post_element: PostElement) => {
    const getSelect = (id: string): HTMLSelectElement => {
      return getElement<HTMLSelectElement>(`#${id}`);
    };
    const getInput = (id: string): HTMLInputElement => {
      return getElement<HTMLInputElement>(`#${id}`);
    };

    const dom = {
      physical_desc: getInput("txt_physicalDescription"),
      item_type: getSelect("txt_itemType"),
      posting_date: getInput("txt_dateOfPosting"),
      content_type: getSelect("txt_contentType"),
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
      sndr_postcode: getInput("txt_senderPostcode"),
    };

    // 등기 Packet 입력
    if (post_element.ItemID.startsWith("L") || post_element.ItemID.startsWith("R")) {
      dom.physical_desc.value = "Packet";
      dom.item_type.value = "Packet";
    }

    // Date of Posting 빈 칸일 경우 입력
    if (dom.posting_date.value === "") {
      const converted_date = `${post_element.ApplicationDate.substring(5, 6)}/${post_element.ApplicationDate.substring(3, 4)}/${post_element.ApplicationDate.substring(0, 4)}`;
      dom.posting_date.value = converted_date;
    }

    // Content type
    dom.content_type.value = "Other/various";

    // Item value
    if (dom.item_value_currency.value !== "3") {
      // 이미 SDR이 지정되지 않은 경우에만
      if (dom.item_value.value !== "") {
        const calc_item_value = Math.round(
          (parseFloat(dom.item_value.value) * getExchangeRate(dom.item_value_currency.value)) / 1749
        );
        InjectUtil.GcssSwitchValueForCurrency(
          dom.item_value,
          dom.item_value_currency,
          calc_item_value.toString()
        );
      }
      dom.item_value_currency.value = "3"; // SDR
    }

    // Postage paid
    if (dom.postage_paid_currency.value !== "3") {
      // 이미 SDR이 지정되지 않은 경우에만
      if (dom.postage_paid.value !== "") {
        const calc_postage_paid = Math.round(parseFloat(dom.postage_paid.value) / 1749);
        InjectUtil.GcssSwitchValueForCurrency(
          dom.postage_paid,
          dom.postage_paid_currency,
          calc_postage_paid.toString()
        );
      }
      dom.postage_paid_currency.value = "3"; // SDR
    }

    // Indemnity amount
    if (dom.indemnity_amount_currency.value !== "3") {
      // 이미 SDR이 지정되지 않은 경우에만
      if (dom.item_value.value !== "" || dom.postage_paid.value !== "") {
        const calc_indemnity_amount =
          parseInt(dom.item_value.value) + parseInt(dom.postage_paid.value);
        InjectUtil.GcssSwitchValueForCurrency(
          dom.indemnity_amount,
          dom.indemnity_amount_currency,
          calc_indemnity_amount.toString()
        );
      }
      dom.indemnity_amount_currency.value = "3"; // SDR
    }

    // POD required
    dom.pod_required_no.checked = true;

    // Contents
    InjectUtil.GcssSwitchValue(dom.item_contents, post_element.Contents);

    // Addressee name
    InjectUtil.GcssSwitchValue(
      dom.addr_name,
      post_element.AddresseeName,
      dom.addr_name.value.length === 0 ? false : true
    );

    InjectUtil.GcssSwitchValue(dom.addr_street, post_element.AddresseeAddress);
    InjectUtil.GcssSwitchValue(dom.addr_phone, post_element.AddresseePhone);
    if (dom.addr_email.value.search(String.raw`;`) !== -1 && dom.addr_email.value.length > 1) {
      InjectUtil.GcssSwitchValue(
        dom.addr_email,
        dom.addr_email.value.toLowerCase().replace(";", "@")
      );
    }
    InjectUtil.GcssSwitchValue(dom.addr_postcode, post_element.AddresseeZipcode);

    if (dom.addr_city.value === "") dom.addr_city.value = ".";

    // Sender Name
    InjectUtil.GcssSwitchValue(
      dom.sndr_name,
      post_element.SenderName,
      dom.sndr_name.value.length === 0 ? false : true
    );
    InjectUtil.GcssSwitchValue(dom.sndr_street, post_element.SenderAddress);
    InjectUtil.GcssSwitchValue(dom.sndr_phone, post_element.SenderPhone);

    if (dom.sndr_city.value === "") dom.sndr_city.value = ".";
    if (dom.sndr_postcode.value === "") dom.sndr_postcode.value = ".";

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
      InjectUtil.IcareSwitchValue(
        dom.addr_email,
        dom.addr_email.value.toLowerCase().replace(";", "@")
      );
    }

    InjectUtil.InjectIcarePersonalRemarks();
    console.log("Dom Injected");
  };

  async function FindPostElement(item_id: string): Promise<PostElement> {
    const raw_post_element = await SendRequest<PostElement>(
      new Msg(COMMANDS.FETCH_POST_ELEMENT, item_id)
    );

    return raw_post_element;
  }
})();
