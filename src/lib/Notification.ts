import { WorkflowItem } from "../background/GetUnreadReplies/DataWrapper";
import { COMMANDS } from "./Message";

export default async function CreateNotification(WorkFlowItems: WorkflowItem[]) {
  let last_num = parseInt(await chrome.action.getBadgeText({}))?? 0;
  const current_num = WorkFlowItems.length;
  console.log("current number: ", WorkFlowItems.length, "  last number: ", last_num);
  if (last_num >= current_num) {
    let item_count = "-1";
    if (current_num > 0) {
      item_count = current_num.toString();
    } else {
      item_count = "";
    }
    chrome.action.setBadgeText({ text: item_count });
    return;
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
