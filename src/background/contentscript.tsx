import { Padding } from "@mui/icons-material";
import COMMANDS from "../lib/Enums";
import Msg from "../lib/Message";
import GcssInject from "./injectDOM/GcssInject";
import { PostElement } from "../lib/PostUtil";
import InjectUtil from "./injectDOM/InjectUtil";

(() => {
  async function SendCommand(message: Msg): Promise<string> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response);
      });
    });
  }
  async function FindPostElement(item_id: string): Promise<PostElement> {
    const raw_post_element: string = await SendCommand(new Msg(COMMANDS.FETCH_POST_ELEMENT, item_id));

    return new PostElement(JSON.parse(raw_post_element));
  }
  window.onload = async () => {
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

        const post_element = await FindPostElement(item_id);

        if (!post_element.ItemTracked) {
          console.log(`Item does not exist ${item_id}`);
          return;
        }

        const injectGcss = () => {
          function getElement<T>(id: string): T {
            return document.querySelector(`#${id}`) as T;
          }
          const getSelect = (id: string): HTMLSelectElement => {
            return getElement<HTMLSelectElement>(id);
          };
          const getInput = (id: string): HTMLInputElement => {
            return getElement<HTMLInputElement>(id);
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
          InjectUtil.SwitchValue(dom.item_contents, post_element.Contents);

          const calc_item_value = Math.round((parseFloat(dom.item_value.value) * 1400) / 1749);
          const calc_postage_paid = Math.round(parseFloat(dom.postage_paid.value) / 1749);
          const calc_indemnity_amount = calc_item_value + calc_postage_paid;
          InjectUtil.SwitchValue(dom.item_value, calc_item_value.toString());
          InjectUtil.SwitchValue(dom.postage_paid, calc_postage_paid.toString());
          InjectUtil.SwitchValue(dom.indemnity_amount, calc_indemnity_amount.toString());

          InjectUtil.SwitchValue(dom.addr_name, post_element.AddresseeName, true);
          InjectUtil.SwitchValue(dom.addr_street, post_element.AddresseeAddress);
          InjectUtil.SwitchValue(dom.addr_phone, post_element.AddresseePhone);
          if (dom.addr_email.value.search(String.raw`;`) !== -1 && dom.addr_email.value.length > 1) {
            InjectUtil.SwitchValue(dom.addr_email, dom.addr_email.value.toLowerCase().replace(";", "@"));
          }
          InjectUtil.SwitchValue(dom.addr_postcode, post_element.AddresseeZipcode);

          InjectUtil.SwitchValue(dom.sndr_name, post_element.SenderName, true);
          InjectUtil.SwitchValue(dom.sndr_street, post_element.SenderAddress);
          InjectUtil.SwitchValue(dom.sndr_phone, post_element.SenderPhone);

          console.log("dom injected");
        };

        injectGcss();

        // <option value="401">Update / confirmation item status</option><option value="404">Damage / missing contents</option><option value="406">Customs investigation</option><option value="405">Missent / redirected / transit</option><option value="403">Request for change</option><option value="407">Explanation delayed delivery / processing</option><option value="408">Unexplained return of item</option><option value="402">WPOD</option><option value="409">COD amount not received </option></select>

        console.log(post_element);
      }
    }
  };
})();
