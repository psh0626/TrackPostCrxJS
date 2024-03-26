import COMMANDS from "../lib/Enums";
import Msg from "../lib/Message";
import { PostAPI, PostElement } from "../lib/PostUtil";

const GCSS_URL = "https://gcss.ipc.be";
const ICARE_URL = "https://icare.post";
console.log("BackgroundWorker has been initiated.");

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
chrome.runtime.onMessage.addListener((message: Msg, sender, sendResponse) => {
  console.log(message);
  if (message.Command === COMMANDS.FETCH_POST_ELEMENT) {
    (async () => {
      if (!message.ItemId) {
        console.log(`item id is undefined`);
        return false;
      }
      const post_elm = JSON.stringify(await PostAPI.FetchPostElement(message.ItemId));
      sendResponse(post_elm);
      console.log("Response Sent");
      console.log(post_elm);
    })();
    return true;
  }
});
chrome.tabs.onUpdated.addListener((tabId, changed, tab: chrome.tabs.Tab) => {
  if (tab.url == null) {
    return;
  }

  const url = new URL(tab.url);

  if (url.origin == GCSS_URL) {
    chrome.sidePanel.setOptions({
      tabId,
      path: "index.html",
      enabled: true,
    });
    //console.log(`sidepanel enabled for ${url.toString()}`);

    if (url.pathname.includes("/create/")) {
    }
  } else if (url.origin == ICARE_URL) {
    chrome.sidePanel.setOptions({
      tabId,
      path: "index.html",
      enabled: true,
    });
    console.log(`sidepanel enabled for ${url.toString()}`);

    const queryParams = url.searchParams;
    if (queryParams.has("action") && queryParams.get("action") === "view") {
    }
  }
});
