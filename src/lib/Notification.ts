import { GcssItem, WorkflowItem } from "../background/GetUnreadReplies/DataWrapper";
import { COMMANDS } from "./Message";
import { IMICSettings } from "./OptionElement";

async function CheckFetchError() {
  type FetchError = {
    ICARE: boolean;
    GCSS: boolean;
  };
  const err: FetchError = (await chrome.storage.session.get("FETCH_ERROR")).FETCH_ERROR;
  if (!err) return false;
  if (err.GCSS || err.ICARE) {
    return err;
  }
  return false;
}
export default async function CreateNotification(force_update = false) {
  const settings = new IMICSettings();
  await settings.LoadOptions();

  const fetch_error = await CheckFetchError();

  let WorkFlowItems: WorkflowItem[];
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
    let item_count: string;
    if (current_num > 0) {
      item_count = current_num.toString();
    } else {
      item_count = "";
    }
    if (!fetch_error) await chrome.action.setBadgeText({ text: item_count });
    if (!force_update) return;
  } else await chrome.action.setBadgeText({ text: `${current_num}` });

  if (fetch_error && !force_update) return;

  let mapped_items: chrome.notifications.ItemOptions[] = [];
  let gcss_mapped_items: chrome.notifications.ItemOptions[] = [];

  if (Array.isArray(WorkFlowItems)) {
    mapped_items = WorkFlowItems.map((item) => {
      const is_outbound = item.tracking_id.slice(-2) === "KR";
      return {
        title: `iCare L${item.current_level} ${is_outbound ? "발송" : "도착"}`,
        message: `${item.tracking_id} ${is_outbound ? "(" + item.replying_op.substring(0, 2) + ")" : ""}`,
      } as chrome.notifications.ItemOptions;
    });
  }
  if (Array.isArray(GcssItems)) {
    gcss_mapped_items = GcssItems.map((item) => {
      const is_outbound = item.OriginCountry === "KR";
      return {
        title: `GCSS ${item.WorkflowLevel} ${is_outbound ? "발송" : "도착"}`,
        message: `${item.ItemId} ${is_outbound ? "(" + item.DestinationCountry + ")" : ""}`,
      } as chrome.notifications.ItemOptions;
    });
  }
  const combined = [
    ...(Array.isArray(gcss_mapped_items) ? gcss_mapped_items : []),
    ...(Array.isArray(mapped_items) ? mapped_items : []),
  ];

  if (!Array.isArray(combined) || combined.length < 1) return;

  const err_msg = fetch_error ? (fetch_error.GCSS ? "(GCSS 에러)\n" : "(i-Care 에러)\n") : "";

  const options: chrome.notifications.NotificationOptions<true> = {
    type: "list",
    priority: 2,
    requireInteraction: true,
    iconUrl: "src/ext-icon.png",
    title: `${err_msg}IMIC 알림: ${current_num}개 메시지 대기`,
    message: `GCSS/iCare 읽지 않은 메시지가 ${current_num}개 있습니다.`,
    contextMessage: `GCSS/Icare unread replies: ${current_num}`,
    items: combined,
    buttons: [{ title: "확인" }],
  };
  chrome.notifications.clear(COMMANDS.ICARE_UNREAD_REPLIES);
  chrome.notifications.create(COMMANDS.ICARE_UNREAD_REPLIES, options);
  return true;
}
