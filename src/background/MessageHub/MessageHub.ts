import { COMMANDS, Msg } from "../../lib/Message";
import { PostAPI } from "../../lib/PostUtil";
import { GcssItem, WorkflowItem } from "../GetUnreadReplies/DataWrapper";
import { PopupTracker } from "../serviceworker";
import CreateNotification from "../../lib/Notification";

export default function ProcessMessage(
    Message: Msg,
    sender: chrome.runtime.MessageSender,
    SendResponse: (response?: unknown) => void
) {
    const today = new Date();
    console.log(
        today.toLocaleString(),
        "\nmessage received from sender: ",
        sender.tab?.url,
        "\ncontent: ",
        Message
    );
    type FetchError = {
        ICARE: boolean;
        GCSS: boolean;
    };

    switch (Message.Command) {
        case COMMANDS.FETCH_POST_ELEMENT:
            void (async () => {
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
            if (["?ICARE", "?GCSS"].includes(Message.Param)) {
                void (async () => {
                    const err_msg = Message.Param.replace("?", "") as keyof FetchError;
                    const which_one: FetchError = { ICARE: false, GCSS: false };
                    which_one[err_msg] = true;
                    console.log("Unable to fetch/communicate data from", which_one);
                    await chrome.storage.session.set({ FETCH_ERROR: which_one });
                    await chrome.action.setBadgeText({ text: "?" });
                })();
                return;
            }

            void (async () => {
                let replies;
                if (Message.Command === COMMANDS.ICARE_UNREAD_REPLIES)
                    replies = Message.Param as WorkflowItem[];
                else replies = Message.Param as GcssItem[];

                const err: FetchError = (await chrome.storage.session.get("FETCH_ERROR"))
                    .FETCH_ERROR;

                if (Message.Command === COMMANDS.ICARE_UNREAD_REPLIES) {
                    if (err) err.ICARE = false;
                    await chrome.storage.session.set({ FETCH_ERROR: err });
                    await chrome.storage.session.set({ ICARE_UNREAD_REPLIES: replies });
                } else {
                    if (err) err.GCSS = false;
                    await chrome.storage.session.set({ FETCH_ERROR: err });
                    await chrome.storage.session.set({ GCSS_UNREAD_REPLIES: replies });
                }
                await CreateNotification();
            })();
            return; // false since we're not sending response

        case COMMANDS.ICARE_UNREAD_REQUESTS:
            void (async () => {
                const requests = Message.Param as WorkflowItem[];
                await chrome.storage.session.set({ ICARE_UNREAD_REQUESTS: requests });
                await CreateNotification();
            })();
            return;

        case COMMANDS.GCSS_UNREAD_REQUESTS:
            void (async () => {
                const reqs = Message.Param as GcssItem[];
                await chrome.storage.session.set({ GCSS_UNREAD_REQUESTS: reqs });
                console.log("MESSAGE HUB SESSION SET - GCSS UNREAD REQUESTS");
                await CreateNotification();
            })();
            return;

        case COMMANDS.GCSS_UNREAD_NOTIF_INBOUND:
        case COMMANDS.GCSS_UNREAD_NOTIF_OUTBOUND:
            void (async () => {
                const session_store: { [key: string]: GcssItem[] } = {};
                session_store[Message.Command] = Message.Param as GcssItem[];
                await chrome.storage.session.set(session_store);
                await CreateNotification();
            })();
            return;

        case COMMANDS.ICARE_UNREAD_NOTIF_INBOUND:
        case COMMANDS.ICARE_UNREAD_NOTIF_OUTBOUND:
            void (async () => {
                const session_store: { [key: string]: WorkflowItem[] } = {};
                session_store[Message.Command] = Message.Param as WorkflowItem[];
                await chrome.storage.session.set(session_store);
                await CreateNotification();
            })();
            return;

        case COMMANDS.POPUP_TRACK_SET:
            Object.assign(PopupTracker, Message.Param);
            void (async () => {
                await chrome.storage.session.set({ PopupTrack: PopupTracker });
                console.log("popup set msg received: ", PopupTracker);
            })();
            return;
        case COMMANDS.SIDEPANEL_TRACK_REQUEST:
            void (async () => {
                const dict = await chrome.storage.session.get("PopupTrack");
                console.log("RESPONSE SENDING: ", dict.PopupTrack);
                SendResponse(dict.PopupTrack);
            })();
            return true;

        case COMMANDS.SAVE_ICARE_USER_ID:
            void chrome.storage.sync.set({ IcareUserId: Message.Param }).then(() => {
                console.log("Icare User ID Saved: ", { IcareUserId: Message.Param });
            });
            return;
        case COMMANDS.LOAD_ICARE_USER_ID:
            void (async () => {
                const dict = await chrome.storage.sync.get("IcareUserId");
                console.log("sending response for user id: ", dict.IcareUserId);
                SendResponse(dict.IcareUserId);
            })();
            return true;

        case COMMANDS.SAVE_OPTIONS:
            void (async () => {
                await chrome.storage.local.set({ IMICSettings: Message.Param });
            })();
            return false;
        case COMMANDS.LOAD_OPTIONS:
            void (async () => {
                const dict = await chrome.storage.local.get("IMICSettings");
                console.log("sending response for IMIC Settings: ", dict.IMICSettings);
                SendResponse(dict.IMICSettings);
            })();
            return true;
    }
}
