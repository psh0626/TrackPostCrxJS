import { COMMANDS, Msg } from "../../lib/Message";
import { PostAPI } from "../../lib/PostUtil";
import { WorkflowItem } from "../GetUnreadReplies/DataWrapper";
import { PopupTracker } from "../serviceworker";
import CreateNotification from "../../lib/Notification";

export default function ProcessMessage(
  Message: Msg,
  sender: chrome.runtime.MessageSender,
  SendResponse: (response?: any) => void
) {
  const today = new Date();
  console.log(today.toLocaleString(), "\nmessage received from sender: ", sender, "\ncontent: ", Message);

  switch (Message.Command) {
    case COMMANDS.FETCH_POST_ELEMENT:
      (async () => {
        if (!Message.Param) {
          console.log(`item id is undefined`);
          return;
        }
        const post_elm = await PostAPI.FetchPostElement(Message.Param);
        SendResponse(post_elm);
        console.log("Response Sent");
        console.log(post_elm);
      })();
      return true; // true makes connection a bit longer;

    case COMMANDS.UNREAD_REPLIES:
        if (Message.Param === "?") {
          console.log("Unable to fetch/communicate data from Icare");
          chrome.action.setBadgeText({ text: "?" });
          return;
        }
      const workflow_items = Message.Param as WorkflowItem[];
      (async () => {
        await chrome.storage.local.set({ WORKFLOWS: workflow_items });
        await CreateNotification(workflow_items);
      })();
      return; // false since we're not sending response

    case COMMANDS.POPUP_TRACK_SET:
      Object.assign(PopupTracker, Message.Param);
      console.log("popup set msg received: ", PopupTracker);
      return;
    case COMMANDS.SIDEPANEL_TRACK_REQUEST:
      console.log("RESPONSE SENDING: ", PopupTracker);
      SendResponse(PopupTracker);
      return true;

    case COMMANDS.SAVE_ICARE_USER_ID:
      chrome.storage.local.set({ IcareUserId: Message.Param });
      return;
    case COMMANDS.LOAD_ICARE_USER_ID:
      (async () => {
        const user_id = chrome.storage.local.get("IcareUserId");
        SendResponse(user_id);
      })();
      return true;
  }
}
