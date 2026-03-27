import { getAllServiceTabs } from "../../lib/findTabs";

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
    SAVE_ICARE_USER_ID = "SAVE_ICARE_USER_ID",
    LOAD_ICARE_USER_ID = "LOAD_ICARE_USER_ID",
    SAVE_OPTIONS = "SAVE_OPTIONS",
    LOAD_OPTIONS = "LOAD_OPTIONS",
    SETTINGS_CHANGED = "SETTINGS_CHANGED",
    EXCHANGE_RATES_UPDATED = "EXCHANGE_RATES_UPDATED",
    KMMBOX_REFRESH = "KMMBOX_REFRESH",
}

export class MSG {
    public readonly Command: CMD;
    public readonly Param: any = null;

    constructor(command: CMD, param?: any) {
        this.Command = command;
        this.Param = param;
    }
    public readonly fromContent = {
        toServiceWaitResponse<T>(): Promise<T> {
            return new Promise((resolve) => {
                chrome.runtime.sendMessage(this, (response) => {
                    resolve(response);
                });
            });
        },
        toService(): Promise<void> {
            return chrome.runtime.sendMessage(this);
        },
    };
    public readonly fromService = {
        toTab(tab: chrome.tabs.Tab): Promise<void> {
            if (tab && tab.id)
                return chrome.tabs.sendMessage(tab.id, this).catch(() => {
                    chrome.tabs.reload(tab.id!);
                });
            return Promise.resolve();
        },

        async notifyAllTabs(): Promise<void> {
            const allTabs = await getAllServiceTabs(true);
            if (!allTabs || allTabs.length === 0) {
                return;
            }
            allTabs.forEach((tab) => {
                if (tab && tab.id) {
                    chrome.tabs.sendMessage(tab.id, this).catch(() => {
                        chrome.tabs.reload(tab.id!);
                    });
                }
            });
        },
    };
}
