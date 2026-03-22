export enum CMD {
    NULL = "NULL",
    FETCH_POST_ELEMENT = "FETCH_POST_ELEMENT",
    FETCH_REQUEST = "FETCH_REQUEST",
    WEB_REQUEST_COMPLETE = "WEB_REQUEST_COMPLETE",
    ICARE_UNREAD_REPLIES = "ICARE_UNREAD_REPLIES",
    ICARE_UNREAD_REQUESTS = "ICARE_UNREAD_REQUESTS",
    ICARE_UNREAD_NOTIF_INBOUND = "ICARE_UNREAD_NOTIF_INBOUND",
    ICARE_UNREAD_NOTIF_OUTBOUND = "ICARE_UNREAD_NOTIF_OUTBOUND",
    GCSS_UNREAD_REPLIES = "GCSS_UNREAD_REPLIES",
    GCSS_UNREAD_REQUESTS = "GCSS_UNREAD_REQUESTS",
    GCSS_UNREAD_NOTIF_INBOUND = "GCSS_UNREAD_NOTIF_INBOUND",
    GCSS_UNREAD_NOTIF_OUTBOUND = "GCSS_UNREAD_NOTIF_OUTBOUND",
    NEW_GCSS_UNREAD_REPLIES = "NEW_GCSS_UNREAD_REPLIES",
    NEW_GCSS_UNREAD_REQUESTS = "NEW_GCSS_UNREAD_REQUESTS",
    NEW_GCSS_UNREAD_NOTIF_INBOUND = "NEW_GCSS_UNREAD_NOTIF_INBOUND",
    NEW_GCSS_UNREAD_NOTIF_OUTBOUND = "NEW_GCSS_UNREAD_NOTIF_OUTBOUND",
    NEW_GCSS_MONITOR_PREFILL_REQUEST = "NEW_GCSS_MONITOR_PREFILL_REQUEST",
    POPUP_TRACK_SET = "POPUP_TRACK_SET",
    SIDEPANEL_TRACK_REQUEST = "SIDEPANEL_TRACK_REQUEST",
    SAVE_ICARE_USER_ID = "SAVE_ICARE_USER_ID",
    LOAD_ICARE_USER_ID = "LOAD_ICARE_USER_ID",
    SAVE_OPTIONS = "SAVE_OPTIONS",
    LOAD_OPTIONS = "LOAD_OPTIONS",
    SETTINGS_CHANGED = "SETTINGS_CHANGED",
    KMMBOX_REFRESH = "KMMBOX_REFRESH",
}

export class MSG {
    public readonly Command: CMD;
    public readonly Param: any = null;

    constructor(command: CMD, param?: any) {
        this.Command = command;
        this.Param = param;
    }
    getResponse<T>(): Promise<T>;
    getResponse(): Promise<any> {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(this, (response) => {
                resolve(response);
            });
        });
    }
    notifyHub(): Promise<any>{
        return chrome.runtime.sendMessage(this);
    }

}
export async function sendRequest<T>(message: MSG, param?: any): Promise<T>;
export async function sendRequest(message: MSG, param?: any): Promise<any>;
export async function sendRequest<T>(message: MSG, param?: any): Promise<T | any> {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, param, (response) => {
            resolve(response);
        });
    });
}
