import { Msg, COMMANDS } from "../lib/Message";
import { PostAPI, PostElement } from "../lib/PostUtil";
import { WorkflowItem } from "./GetUnreadReplies/DataWrapper";
import PopupTrack from "../lib/PopupTrack";

const GCSS_URL = "https://gcss.ipc.be";
const ICARE_URL = "https://icare.post";
console.log("BackgroundWorker has been initiated.");

let MsgPort: chrome.runtime.Port | null = null;

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));
chrome.action.setBadgeBackgroundColor({ color: "#424242" });
chrome.action.setBadgeTextColor({ color: "white" });
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
chrome.runtime.onConnect.addListener((port) => {
  if (port.sender?.url?.includes("icare.post")) MsgPort = port;
});
chrome.runtime.onMessage.addListener( (message: Msg, sender, sendResponse) => { // do not use async here it becomes stupid!!!
  const today = new Date();
  console.log(today.toLocaleString(), "\nmessage received from sender: ", sender, "\ncontent: ", message);
  if (message.Command === COMMANDS.FETCH_POST_ELEMENT) {
    (async () => {
      if (!message.Param) {
        console.log(`item id is undefined`);
        return false;
      }
      const post_elm = JSON.stringify(await PostAPI.FetchPostElement(message.Param));
      sendResponse(post_elm);
      console.log("Response Sent");
      console.log(post_elm);
    })();
    return true;
  } else if (message.Command === COMMANDS.UNREAD_REPLIES) {
    (async ()=>{
      if (message.Param === "?") {
        console.log("Unable to fetch/communicate data from Icare");
        chrome.action.setBadgeText({ text: "?" });
        return;
      }
      const workflow_items: WorkflowItem[] = JSON.parse(message.Param);
      //console.log("workflow items received: ", workflow_items);
      await CreateNotification(workflow_items);
    })();
  }
});

async function CreateNotification(WorkFlowItems: WorkflowItem[]) {
  const last_num = parseInt(await chrome.action.getBadgeText({}));
  console.log("current number: ", WorkFlowItems.length, "  last number: ", last_num);
  if (last_num >= WorkFlowItems.length  || WorkFlowItems.length <= 0) {
    let item_count = "-1";
    if(WorkFlowItems.length >= 1){
      item_count = WorkFlowItems.length.toString();
    }else{
      item_count = "";
    }
    chrome.action.setBadgeText({ text: item_count });
    return true;
  }
  const mapped_items = WorkFlowItems.map((item: WorkflowItem) => {
    return {
      title: `L${item.current_level} ${item.workflow_status}`,
      message: `${item.tracking_id} (${item.tracking_id.slice(-2) === "KR" ? item.replying_op.substring(0, 2) : item.requesting_op.substring(0, 2)})`,
    } as chrome.notifications.ItemOptions;
  });
  chrome.action.setBadgeText({ text: `${WorkFlowItems.length}` });
  const options = {
    type: "list",
    priority: 2,
    requireInteraction: true,
    iconUrl: "src/ext-icon.png",
    title: `IMIC 알림: ${WorkFlowItems.length}개 메시지 대기`,
    message: `ICare 읽지 않은 메시지가 ${WorkFlowItems.length}개 있습니다.`,
    contextMessage: `Icare unread replies: ${WorkFlowItems.length}`,
    items: mapped_items,
    buttons: [{ title: "확인" }, { title: "닫기" }],
  };
  chrome.notifications.clear(COMMANDS.UNREAD_REPLIES);
  chrome.notifications.create(COMMANDS.UNREAD_REPLIES, options as chrome.notifications.NotificationOptions<true>);
  return true;
}

chrome.notifications.onClicked.addListener((id) => {
  if (id === COMMANDS.UNREAD_REPLIES) {
    chrome.notifications.clear(id);
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
      path: "sidepanel.html",
      enabled: true,
    });
    //console.log(`sidepanel enabled for ${url.toString()}`);

    if (url.pathname.includes("/create/")) {
    }
  } else if (url.origin == ICARE_URL) {
    chrome.sidePanel.setOptions({
      tabId,
      path: "sidepanel.html",
      enabled: true,
    });
    console.log(`sidepanel enabled for ${url.toString()}`);

    const queryParams = url.searchParams;
    if (queryParams.has("action") && queryParams.get("action") === "view") {
    }
  }
});
