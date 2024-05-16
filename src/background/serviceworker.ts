import { Msg, COMMANDS } from "../lib/Message";
import { PostAPI, PostElement } from "../lib/PostUtil";
import { WorkflowItem } from "./GetUnreadReplies/DataWrapper";
import PopupTrack from "../lib/PopupTrack";
import CreateNotification from "../lib/Notification";
import ProcessMessage from "./MessageHub/MessageHub";

//chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));
chrome.action.setBadgeBackgroundColor({ color: "#424242" });
chrome.action.setBadgeTextColor({ color: "white" });

const GCSS_URL = "https://gcss.ipc.be";
const ICARE_URL = "https://icare.post";
console.log("BackgroundWorker has been initiated.");

let MsgPort: chrome.runtime.Port | null = null;
export const PopupTracker = new PopupTrack();

main();

function main() {}

chrome.webRequest.onCompleted.addListener(
  function (details) {
    if (details.method === "GET") {
      if (details.url.includes("icare.post/?module=workflow&action=requestFields")) {
        console.log("API GET request completed: ", details.url);
        (async () => {
          const [tab] = await chrome.tabs.query({ url: ICARE_URL + "/*" });
          if (tab) {
            if (!MsgPort) {
              console.log(
                "Message port is not open. Unable to send a message to the content script"
              );
              return;
            }
            MsgPort.postMessage(new Msg(COMMANDS.WEB_REQUEST_COMPLETE));
            console.log("Message Sent to content script in: ", tab.title);
            return true;
          }
          return false;
        })();
        return false;
      } else if (details.url.includes("icare.post/?module=workflow&action=replyFields")) {
        console.log("API GET request completed: ", details.url);
        (async () => {
          const [tab] = await chrome.tabs.query({ url: ICARE_URL + "/*" });
          if (!tab) {
            return false;
          }
          if (!MsgPort) {
            console.log("Message port is not open. Unable to send a message to the content script");
            return;
          }
          MsgPort.postMessage(new Msg(COMMANDS.WEB_REQUEST_COMPLETE));
          console.log("Message Sent to content script in: ", tab.title);
          return true;
        })();
        return false;
      }
    }
  },
  { urls: ["*://icare.post/*"] }
);

chrome.runtime.onConnect.addListener((port) => {
  if (port.sender?.url?.includes("icare.post")) MsgPort = port;
});

chrome.runtime.onMessage.addListener(ProcessMessage);

chrome.notifications.onClicked.addListener((id) => {
  if (id === COMMANDS.ICARE_UNREAD_REPLIES) {
    chrome.notifications.clear(id);
  }
});

chrome.notifications.onButtonClicked.addListener((noti_id, button_id) => {
  if (noti_id === COMMANDS.ICARE_UNREAD_REPLIES) {
    chrome.tabs.getCurrent((tab) => {
      if (tab)
        chrome.windows.update(tab.windowId, { focused: true }, (_) => chrome.action.openPopup());
    });
  }
});

// chrome.tabs.onUpdated.addListener((tabId, changed, tab: chrome.tabs.Tab) => {
//   if (tab.url == null) {
//     return;
//   }

//   const url = new URL(tab.url);

//   if (url.origin == GCSS_URL) {
//     chrome.sidePanel.setOptions({
//       tabId,
//       path: "sidepanel.html",
//       enabled: true,
//     });
//     //console.log(`sidepanel enabled for ${url.toString()}`);

//     if (url.pathname.includes("/create/")) {
//     }
//   } else if (url.origin == ICARE_URL) {
//     chrome.sidePanel.setOptions({
//       tabId,
//       path: "sidepanel.html",
//       enabled: true,
//     });
//     console.log(`sidepanel enabled for ${url.toString()}`);

//     const queryParams = url.searchParams;
//     if (queryParams.has("action") && queryParams.get("action") === "view") {
//     }
//   }
// });
