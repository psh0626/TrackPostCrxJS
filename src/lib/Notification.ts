import { GcssItem, WorkflowItem } from "../background/GetUnreadReplies/DataWrapper";
import { COMMANDS } from "./Message";
import { IMICSettings } from "./OptionElement";

export default async function CreateNotification(force_update = false) {
  const settings = new IMICSettings();
  await settings.LoadOptions();

  let WorkFlowItems: WorkflowItem[] = [];
  let GcssItems: GcssItem[] = [];

  let dict = await chrome.storage.session.get("ICARE_UNREAD_REPLIES");
  WorkFlowItems = dict.ICARE_UNREAD_REPLIES as WorkflowItem[];

  if (settings.IcareUnreadRequests) {
    dict = await chrome.storage.session.get("ICARE_UNREAD_REQUESTS");
    const reqs = dict.ICARE_UNREAD_REQUESTS as WorkflowItem[];
    WorkFlowItems = [
      ...(Array.isArray(WorkFlowItems) ? WorkFlowItems : []),
      ...(Array.isArray(reqs) ? reqs : []),
    ];
  }
  let current_num = Array.isArray(WorkFlowItems) ? WorkFlowItems.length : 0;

  if (settings.GcssUnreadReplies) {
    dict = await chrome.storage.session.get("GCSS_UNREAD_REPLIES");
    GcssItems = dict.GCSS_UNREAD_REPLIES as GcssItem[];
  }

  if (settings.GcssUnreadRequests) {
    dict = await chrome.storage.session.get("GCSS_UNREAD_REQUESTS");
    const reqs = dict.GCSS_UNREAD_REQUESTS as GcssItem[];
    GcssItems = [
      ...(Array.isArray(GcssItems) ? GcssItems : []),
      ...(Array.isArray(reqs) ? reqs : []),
    ];
  }

  current_num += Array.isArray(GcssItems) ? GcssItems.length : 0;

  let last_num = parseInt(await chrome.action.getBadgeText({})) ?? 0;
  if (isNaN(last_num)) last_num = 0;

  console.log("current number: ", current_num, "  last number: ", last_num);

  if (last_num >= current_num) {
    let item_count = "-1";
    if (current_num > 0) {
      item_count = current_num.toString();
    } else {
      item_count = "";
    }
    chrome.action.setBadgeText({ text: item_count });

    if (!force_update) return;
  } else chrome.action.setBadgeText({ text: `${current_num}` });

  let mapped_items: chrome.notifications.ItemOptions[] = [];
  let gcss_mapped_items: chrome.notifications.ItemOptions[] = [];

  if (Array.isArray(WorkFlowItems)) {
    mapped_items = WorkFlowItems.map((item) => {
      return {
        title: `iCare L${item.current_level} ${item.workflow_status === "Replied" ? "발송" : "도착"}`,
        message: `${item.tracking_id} ${item.tracking_id.slice(-2) === "KR" ? "(" + item.replying_op.substring(0, 2) + ")" : ""}`,
      } as chrome.notifications.ItemOptions;
    });
  }
  if (Array.isArray(GcssItems)) {
    gcss_mapped_items = GcssItems.map((item) => {
      return {
        title: `GCSS ${item.WorkflowLevel} ${item.OriginCountry === "KR" ? "발송" : "도착"}`,
        message: `${item.ItemId} ${item.OriginCountry === "KR" ? "(" + item.DestinationCountry + ")" : ""}`,
      } as chrome.notifications.ItemOptions;
    });
  }
  const combined = [
    ...(Array.isArray(gcss_mapped_items) ? gcss_mapped_items : []),
    ...(Array.isArray(mapped_items) ? mapped_items : []),
  ];

  const options = {
    type: "list",
    priority: 2,
    requireInteraction: true,
    iconUrl: "src/ext-icon.png",
    title: `IMIC 알림: ${current_num}개 메시지 대기`,
    message: `GCSS/iCare 읽지 않은 메시지가 ${current_num}개 있습니다.`,
    contextMessage: `GCSS/Icare unread replies: ${current_num}`,
    items: combined,
    buttons: [{ title: "확인" }],
  };
  chrome.notifications.clear(COMMANDS.ICARE_UNREAD_REPLIES);
  chrome.notifications.create(
    COMMANDS.ICARE_UNREAD_REPLIES,
    options as chrome.notifications.NotificationOptions<true>
  );
  return true;
}
