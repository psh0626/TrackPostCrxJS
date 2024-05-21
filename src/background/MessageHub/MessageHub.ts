import { COMMANDS, Msg } from "../../lib/Message";
import { PostAPI } from "../../lib/PostUtil";
import { GcssItem, WorkflowItem } from "../GetUnreadReplies/DataWrapper";
import { PopupTracker } from "../serviceworker";
import CreateNotification from "../../lib/Notification";

export default function ProcessMessage(
  Message: Msg,
  sender: chrome.runtime.MessageSender,
  SendResponse: (response?: any) => void
) {
  const today = new Date();
  console.log(
    today.toLocaleString(),
    "\nmessage received from sender: ",
    sender.tab?.url,
    "\ncontent: ",
    Message
  );

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

    case COMMANDS.GCSS_UNREAD_REPLIES:
    case COMMANDS.ICARE_UNREAD_REPLIES:
      if (Message.Param === "?") {
        console.log("Unable to fetch/communicate data from Gcss or iCare");
        chrome.action.setBadgeText({ text: "?" });
        return;
      }

      let replies;
      if (Message.Command === COMMANDS.ICARE_UNREAD_REPLIES)
        replies = Message.Param as WorkflowItem[];
      else replies = Message.Param as GcssItem[];
      
      (async () => {
        if (Message.Command === COMMANDS.ICARE_UNREAD_REPLIES)
          await chrome.storage.session.set({ ICARE_UNREAD_REPLIES: replies });
        else await chrome.storage.session.set({ GCSS_UNREAD_REPLIES: replies });

        await CreateNotification();
      })();
      return; // false since we're not sending response

    case COMMANDS.ICARE_UNREAD_REQUESTS:
      const requests = Message.Param as WorkflowItem[];
      (async () => {
        await chrome.storage.session.set({ ICARE_UNREAD_REQUESTS: requests });
        await CreateNotification();
      })();
      return;
  
    case COMMANDS.GCSS_UNREAD_REQUESTS:
      const reqs = Message.Param as GcssItem[];
      (async () => {
        await chrome.storage.session.set({ GCSS_UNREAD_REQUESTS: reqs });
        console.log("MESSAGE HUB SESSION SET - GCSS UNREAD REQUESTS");
        await CreateNotification();
      })();
      return;

    case COMMANDS.POPUP_TRACK_SET:
      Object.assign(PopupTracker, Message.Param);
      chrome.storage.session.set({ PopupTrack: PopupTracker });
      console.log("popup set msg received: ", PopupTracker);
      return;
    case COMMANDS.SIDEPANEL_TRACK_REQUEST:
      (async () => {
        const dict = await chrome.storage.session.get("PopupTrack");
        console.log("RESPONSE SENDING: ", dict.PopupTrack);
        SendResponse(dict.PopupTrack);
      })();
      return true;

    case COMMANDS.SAVE_ICARE_USER_ID:
      chrome.storage.sync.set({ IcareUserId: Message.Param }).then((dict) => {
        console.log("Icare User ID Saved: ", { IcareUserId: Message.Param });
      });
      return;
    case COMMANDS.LOAD_ICARE_USER_ID:
      (async () => {
        const dict = await chrome.storage.sync.get("IcareUserId");
        console.log("sending response for user id: ", dict.IcareUserId);
        SendResponse(dict.IcareUserId);
      })();
      return true;

    case COMMANDS.SAVE_OPTIONS:
      (async () => {
        chrome.storage.local.set({ IMICSettings: Message.Param });
      })();
      return false;
    case COMMANDS.LOAD_OPTIONS:
      (async () => {
        const dict = await chrome.storage.local.get("IMICSettings");
        console.log("sending response for IMIC Settings: ", dict.IMICSettings);
        SendResponse(dict.IMICSettings);
      })();
      return true;
  }
}
