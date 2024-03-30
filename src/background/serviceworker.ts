import COMMANDS from "../lib/Enums";
import Msg from "../lib/Message";
import { PostAPI, PostElement } from "../lib/PostUtil";

const GCSS_URL = "https://gcss.ipc.be";
const ICARE_URL = "https://icare.post";
console.log("BackgroundWorker has been initiated.");

let MsgPort: chrome.runtime.Port | null = null;

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

chrome.webRequest.onCompleted.addListener(
  function (details) {
    if (details.method === "GET" && details.url.includes("icare.post/?module=workflow&action=requestFields")) {
      console.log("API GET request completed: ", details.url);
      (async () => {
        const [tab] = await chrome.tabs.query({ url: ICARE_URL + "/*" });
        if (tab) {
          if (!MsgPort) {
            console.log("Message port is not open. Unable to send a message to the content script");
            return;
          }
          MsgPort.postMessage(new Msg(COMMANDS.WEB_REQUEST_COMPLETE));
          console.log("Message Sent to content script in: ", tab.title);
          return true;
        }
        return false;
      })();
      return false;
    }
  },
  { urls: ["*://icare.post/*"] }
);
chrome.runtime.onConnect.addListener(port => {
  if (port.sender?.url?.includes("icare.post"))
    MsgPort = port;
});
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
