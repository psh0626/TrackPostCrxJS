import COMMANDS from "../lib/Enums";
import Msg from "../lib/Message";
import { PostElement } from "../lib/PostUtil";

(() => {
  window.onload = async () => {
    console.log("Content script loaded");

    const GCSS_URL = "https://gcss.ipc.be";
    const ICARE_URL = "https://icare.post";

    const currentURL = new URL(document.URL);
    if (currentURL.origin === GCSS_URL) {
      if (currentURL.pathname.includes("/create/")) {
        const item_id: string =
          document.querySelector(".value")?.textContent?.trim() ?? "";

        if (!item_id) {
          console.log("Cannot find item_id in document classname 'value'");
          return;
        }

        const raw_post_element: string = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            new Msg(COMMANDS.FETCH_POST_ELEMENT, item_id),
            (response) => {
              resolve(response);
            }
          );
        });

        const post_element = new PostElement(JSON.parse(raw_post_element));

        if (!post_element.ItemTracked) {
          console.log(`Unable to fetch item: ${item_id}`);
          return;
        }

        console.log(post_element);
      }
    }
  };
})();
