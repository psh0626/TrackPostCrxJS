import { Msg, COMMANDS } from "../lib/Message";
import PopupTrack from "../lib/PopupTrack";
import CreateNotification from "../lib/Notification";
import ProcessMessage from "./MessageHub/MessageHub";
import { GlobalTimer } from "./GetUnreadReplies/Timer";

//chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));
void chrome.action.setBadgeBackgroundColor({ color: "#424242" });
void chrome.action.setBadgeTextColor({ color: "white" });

// const GCSS_URL = "https://gcss.ipc.be";
const ICARE_URL = "https://icare.post";
console.log("BackgroundWorker has been initiated.");

const MsgPort: { [key: number]: chrome.runtime.Port } = {};
export const PopupTracker = new PopupTrack();

main();

function main() {
  let count = 0;
  GlobalTimer.Callback = async () => await APICalls(count++);
  GlobalTimer.Interval = 30 * 1000;
  GlobalTimer.Start();
}
async function APICalls(count: number, final = false) {
  const today = new Date();
  console.log(`${today.toLocaleTimeString("ko-KR")}: Ticking Global Timer: `, count, " times");
  if (count % 6 === 0) {
    console.log("CreateNotification invoking..");
    await CreateNotification(true);
  }
  const work_tabs = await chrome.tabs.query({
    url: ["https://icare.post/*", "https://gcss.ipc.be/*"],
    status: "complete",
  });
  if (!work_tabs) {
    return;
  }
  console.log("WORK TABS: ", work_tabs);
  if (Array.isArray(work_tabs)) {
    const icare_tab = work_tabs.filter((item: chrome.tabs.Tab) =>
      item.url!.includes("icare.post")
    )[0] as chrome.tabs.Tab;
    const gcss_tab = work_tabs.filter((item: chrome.tabs.Tab) =>
      item.url!.includes("gcss.ipc.be")
    )[0] as chrome.tabs.Tab;

    if (!icare_tab || !gcss_tab) {
      if (final) {
        await chrome.action.setBadgeText({ text: "?" });
      } else {
        setTimeout(async () => {
          await APICalls(count, true);
        }, 2000);
      }
      return;
    }

    if (icare_tab) {
      await chrome.tabs.sendMessage(icare_tab.id!, new Msg(COMMANDS.ICARE_UNREAD_REPLIES));
      console.log(new Date().toLocaleTimeString(), "icare ticked");
    }
    if (gcss_tab) {
      await chrome.tabs.sendMessage(gcss_tab.id!, new Msg(COMMANDS.GCSS_UNREAD_REPLIES));
      console.log(new Date().toLocaleTimeString(), "gcss ticked");
    }
  }
}
chrome.webRequest.onCompleted.addListener(
  function (details) {
    console.log("[onBeforeRequest]", details);
    if (details.url.includes("https://github.com/shawnpark9494/TrackPostExtZip/commits/main/")) {
      console.log(
        "[onBeforeRequest] github commits page requested, extention reload begins..",
        details
      );
      chrome.runtime.reload();
    }
  },
  {
    urls: ["https://github.com/shawnpark9494/TrackPostExtZip/commits/main/"],
  }
);
chrome.webRequest.onCompleted.addListener(
  function (details) {
    if (details.method === "GET") {
      if (details.url.includes("icare.post/?module=workflow&action=requestFields")) {
        console.log("API GET request completed: ", details.url);
        void (async () => {
          const [tab] = await chrome.tabs.query({ url: ICARE_URL + "/*" });
          if (tab) {
            if (!MsgPort) {
              console.log(
                "Message port is not open. Unable to send a message to the content script"
              );
              return;
            }
            MsgPort[details.tabId].postMessage(new Msg(COMMANDS.WEB_REQUEST_COMPLETE));
            console.log("Message Sent to content script in: ", tab.title);
            return true;
          }
          return false;
        })();
        return false;
      } else if (details.url.includes("icare.post/?module=workflow&action=replyFields")) {
        console.log("API GET request completed: ", details.url);
        void (async () => {
          const [tab] = await chrome.tabs.query({ url: ICARE_URL + "/*" });
          if (!tab) {
            return false;
          }
          if (!MsgPort) {
            console.log("Message port is not open. Unable to send a message to the content script");
            return;
          }
          MsgPort[details.tabId].postMessage(new Msg(COMMANDS.WEB_REQUEST_COMPLETE));
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
  if(!port.sender || !port.sender.url || !port.sender.tab || !port.sender.tab.id){
    return;
  }
  const port_url = port.sender.url;
  const port_tab_id = port.sender.tab.id;
  if (port_url.includes("icare.post")) {
    MsgPort[port_tab_id] = port;
    console.log(
      `${new Date().toLocaleString("ko-KR")} - MsgPort established with new connection.`,
      MsgPort,
      "background: ",
      port
    );
    port.onDisconnect.addListener((p) => {
      if(!p.sender || !p.sender.tab || !p.sender.tab.id){
        return;
      }
      const tab_id = p.sender.tab.id;
      delete MsgPort[tab_id];
      console.log(
        `${new Date().toLocaleString("ko-KR")} - MsgPort deleted since the connection is lost.`,
        MsgPort,
        "background: ",
        port,
        port === p
      );
    });
  }
});

chrome.runtime.onMessage.addListener(ProcessMessage);

chrome.notifications.onClicked.addListener((id) => {
  if (id === COMMANDS.ICARE_UNREAD_REPLIES) {
    chrome.notifications.clear(id);
  }
});

chrome.notifications.onButtonClicked.addListener((noti_id) => {
  if (noti_id === COMMANDS.ICARE_UNREAD_REPLIES) {
    chrome.tabs.getCurrent((tab) => {
      if (tab)
        chrome.windows.update(tab.windowId, { focused: true }, () => chrome.action.openPopup());
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
