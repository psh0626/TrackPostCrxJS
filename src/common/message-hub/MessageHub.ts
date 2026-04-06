import { PostAPI } from "@/common/PostUtil";
import createNotification from "../../background-service/lib/notification";
import { IMICSettings } from "../IMICSettings";
import StorageKey from "../StorageKey";
import { CMD, MSG } from "./Message";

export default function processMessage(
    Message: MSG,
    sender: chrome.runtime.MessageSender,
    SendResponse: (response?: unknown) => void,
) {
    const host = sender?.tab?.url ? new URL(sender.tab.url).host : sender?.url ? new URL(sender.url).pathname : sender;
    console.log("[MessageHub] message received from sender: ", host, "\ncontent: ", Message);
    type FetchError = {
        ICARE: boolean;
        GCSS: boolean;
    };
    switch (Message.Command) {
        case CMD.FETCH_POST_ELEMENT:
            void (async () => {
                if (!Message.Param) {
                    console.log(`item id is undefined`);
                    return;
                }
                const post_elm = await PostAPI.fetchPostElement(Message.Param);
                SendResponse(post_elm);
                console.log("Response Sent");
                console.log(post_elm);
            })();
            return true; // true makes connection a bit longer;

        case CMD.ICARE_UNREAD_REQUESTS:
        case CMD.ICARE_UNREAD_REPLIES:
        case CMD.GCSS_UNREAD_REQUESTS:
        case CMD.GCSS_UNREAD_REPLIES:
        case CMD.NEW_GCSS_UNREAD_REQUESTS:
        case CMD.NEW_GCSS_UNREAD_REPLIES:
            const fetchErrorKey = new StorageKey("FETCH_ERROR");
            if (["?ICARE", "?GCSS"].includes(Message.Param)) {
                void (async () => {
                    const err_msg = Message.Param.replace("?", "") as keyof FetchError;
                    const which_one: FetchError = { ICARE: false, GCSS: false };
                    which_one[err_msg] = true;
                    console.log("Unable to fetch/communicate data from", which_one);
                    await fetchErrorKey.fromSession.set(which_one);
                    await chrome.action.setBadgeText({ text: "?" });
                })();
                return;
            }
            void (async () => {
                const err = await fetchErrorKey.fromSession.get<FetchError>();

                if (Message.Command === CMD.ICARE_UNREAD_REPLIES || Message.Command === CMD.ICARE_UNREAD_REQUESTS) {
                    if (err) err.ICARE = false;
                    await fetchErrorKey.fromSession.set(err);
                } else {
                    if (err) err.GCSS = false;
                    await fetchErrorKey.fromSession.set(err);
                }
                await new StorageKey(Message.Command).fromSession.set(Message.Param);
                await createNotification();
            })();
            return;

        case CMD.GCSS_UNREAD_NOTIF_INBOUND:
        case CMD.GCSS_UNREAD_NOTIF_OUTBOUND:
        case CMD.NEW_GCSS_UNREAD_NOTIF_INBOUND:
        case CMD.NEW_GCSS_UNREAD_NOTIF_OUTBOUND:
        case CMD.ICARE_UNREAD_NOTIF_INBOUND:
        case CMD.ICARE_UNREAD_NOTIF_OUTBOUND:
            void (async () => {
                await new StorageKey(Message.Command).fromSession.set(Message.Param);
                await createNotification(false);
            })();
            return;

        case CMD.SAVE_ICARE_USER_ID:
            new StorageKey("IcareUserId").fromSession.set(Message.Param).then(() => {
                console.log("Icare User ID Saved: ", { IcareUserId: Message.Param });
            });
            return;
        case CMD.LOAD_ICARE_USER_ID:
            void (async () => {
                const dict = await new StorageKey("IcareUserId").fromSession.get<string>();
                console.log("sending response for user id: ", dict);
                SendResponse(dict);
            })();
            return true;

        case CMD.SAVE_OPTIONS:
            void (async () => {
                await new StorageKey("IMICSettings").fromLocal.set(Message.Param);
            })();
            return false;
        case CMD.LOAD_OPTIONS:
            void (async () => {
                const dict = await new StorageKey("IMICSettings").fromLocal.get<IMICSettings>();
                console.log("sending response for IMIC Settings: ", dict);
                SendResponse(dict);
            })();
            return true;
        // case CMD.NEW_GCSS_MONITOR_PREFILL_REQUEST:
        //     const prefillMonitor = (details: chrome.webRequest.OnCompletedDetails) => {
        //         console.log("Prefill monitor triggered for: ", details.url);
        //         if (details.statusCode === 200 && details.url.includes(Message.Param)) {
        //             console.log("Prefill request successful for: ", details.url);
        //             chrome.webRequest.onCompleted.removeListener(prefillMonitor);
        //             SendResponse(true);
        //         }
        //     };
        //     chrome.webRequest.onCompleted.addListener(prefillMonitor, {
        //         urls: [GCSS_API_BASE_URL + "/*", GCSS_WEB_BASE_URL + "/*"],
        //     });
        //     return true;
    }
}
