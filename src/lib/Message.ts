export enum COMMANDS {
    NULL = "NULL",
    FETCH_POST_ELEMENT = "FETCH_POST_ELEMENT",
    WEB_REQUEST_COMPLETE = "WEB_REQUEST_COMPLETE",
    ICARE_UNREAD_REPLIES = "ICARE_UNREAD_REPLIES",
    ICARE_UNREAD_REQUESTS = "ICARE_UNREAD_REQUESTS",
    ICARE_UNREAD_NOTIF_INBOUND = "ICARE_UNREAD_NOTIF_INBOUND",
    ICARE_UNREAD_NOTIF_OUTBOUND = "ICARE_UNREAD_NOTIF_OUTBOUND",
    GCSS_UNREAD_REPLIES = "GCSS_UNREAD_REPLIES",
    GCSS_UNREAD_REQUESTS = "GCSS_UNREAD_REQUESTS",
    GCSS_UNREAD_NOTIF_INBOUND = "GCSS_UNREAD_NOTIF_INBOUND",
    GCSS_UNREAD_NOTIF_OUTBOUND = "GCSS_UNREAD_NOTIF_OUTBOUND",
    POPUP_TRACK_SET = "POPUP_TRACK_SET",
    SIDEPANEL_TRACK_REQUEST = "SIDEPANEL_TRACK_REQUEST",
    SAVE_ICARE_USER_ID = "SAVE_ICARE_USER_ID",
    LOAD_ICARE_USER_ID = "LOAD_ICARE_USER_ID",
    SAVE_OPTIONS = "SAVE_OPTIONS",
    LOAD_OPTIONS = "LOAD_OPTIONS",
    SETTINGS_CHANGED = "SETTINGS_CHANGED",
    KMMBOX_REFRESH = "KMMBOX_REFRESH",
}

export class Msg {
    public Command: COMMANDS;
    public Param: any = null;

    constructor(command: COMMANDS, param?: any) {
        this.Command = command;
        this.Param = param;
    }
}
export async function SendRequest<T>(message: Msg, param?: any): Promise<T>;
export async function SendRequest(message: Msg, param?: any): Promise<any>;
export async function SendRequest<T>(message: Msg, param?: any): Promise<T | any> {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, param, (response) => {
            resolve(response);
        });
    });
}
