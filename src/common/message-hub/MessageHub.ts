import { PostAPI } from "@/common/PostUtil";
import createNotification from "../../background-service/lib/notification";
import { CMD, MSG } from "./Message";

export default function processMessage(
    Message: MSG,
    sender: chrome.runtime.MessageSender,
    SendResponse: (response?: unknown) => void,
) {
    console.log(
        "[MessageHub] message received from sender: ",
        new URL(sender?.tab?.url || "")?.host,
        "\ncontent: ",
        Message,
    );
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
                const err: FetchError | undefined = (await chrome.storage.session.get("FETCH_ERROR"))
                    .FETCH_ERROR as FetchError;

                if (Message.Command === CMD.ICARE_UNREAD_REPLIES || Message.Command === CMD.ICARE_UNREAD_REQUESTS) {
                    if (err) err.ICARE = false;
                    await chrome.storage.session.set({ FETCH_ERROR: err });
                } else {
                    if (err) err.GCSS = false;
                    await chrome.storage.session.set({ FETCH_ERROR: err });
                }
                const session_store: { [key: string]: any[] } = {};
                session_store[Message.Command] = Message.Param;
                await chrome.storage.session.set(session_store);
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
                const session_store: { [key: string]: any[] } = {};
                session_store[Message.Command] = Message.Param;
                await chrome.storage.session.set(session_store);
                await createNotification(false);
            })();
            return;

        case CMD.SAVE_ICARE_USER_ID:
            void chrome.storage.sync.set({ IcareUserId: Message.Param }).then(() => {
                console.log("Icare User ID Saved: ", { IcareUserId: Message.Param });
            });
            return;
        case CMD.LOAD_ICARE_USER_ID:
            void (async () => {
                const dict = await chrome.storage.sync.get("IcareUserId");
                console.log("sending response for user id: ", dict.IcareUserId);
                SendResponse(dict.IcareUserId);
            })();
            return true;

        case CMD.SAVE_OPTIONS:
            void (async () => {
                await chrome.storage.local.set({ IMICSettings: Message.Param });
            })();
            return false;
        case CMD.LOAD_OPTIONS:
            void (async () => {
                const dict = await chrome.storage.local.get("IMICSettings");
                console.log("sending response for IMIC Settings: ", dict.IMICSettings);
                SendResponse(dict.IMICSettings);
            })();
            return true;
        case CMD.KMMBOX_REFRESH:
            chrome.scripting.executeScript({
                injectImmediately: true,
                target: { tabId: sender.tab!.id! },
                world: "MAIN",
                func: (folderId: string, unreadCount: number, lastCount: number) => {
                    if (unreadCount !== lastCount) {
                        (window as any).FolderTreePanel.getNodeById(folderId).ui.updateMsgNum(unreadCount);
                        if (unreadCount !== 0) (window as any).Handler.mailListGroupStore.reload();
                    }
                },
                args: [Message.Param.fId, Message.Param.count, Message.Param.lastCount],
            });
            return false;
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
