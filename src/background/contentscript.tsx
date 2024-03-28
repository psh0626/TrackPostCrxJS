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

        console.log(post_element);
        const req_type = document.querySelector("select#sltTypeOfRequest") as HTMLSelectElement;
        console.log(req_type.value);
        req_type.onchange = () => {
          console.log(req_type.value);
          if (req_type.value === "401") {
            const getSelect = (id: string): HTMLSelectElement => {
              return document.querySelector(`#${id}`) as HTMLSelectElement;
            };
            const getInput = (id: string): HTMLInputElement => {
              return document.querySelector(`#${id}`) as HTMLInputElement;
            };
            const dom = {
              item_type: getSelect("txt_contentType"),
              item_value: getInput("txt_itemValue"),
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
            InjectUtil.SwitchValue(dom.addr_name, post_element.AddresseeName, true);
            InjectUtil.SwitchValue(dom.addr_street, post_element.AddresseeAddress);
            InjectUtil.SwitchValue(dom.addr_phone, post_element.AddresseePhone);
            InjectUtil.SwitchValue(dom.addr_email, dom.addr_email.value.toLowerCase().replace(";", "@"));

            console.log("dom injected");
          }
        };

        // <option value="401">Update / confirmation item status</option><option value="404">Damage / missing contents</option><option value="406">Customs investigation</option><option value="405">Missent / redirected / transit</option><option value="403">Request for change</option><option value="407">Explanation delayed delivery / processing</option><option value="408">Unexplained return of item</option><option value="402">WPOD</option><option value="409">COD amount not received </option></select>

        console.log(post_element);
      }
    }
  };
})();
