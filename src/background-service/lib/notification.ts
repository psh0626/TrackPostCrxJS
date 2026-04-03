import { IMICSettings } from "@/common/IMICSettings";
import { CMD } from "@/common/message-hub/Message";
import { GcssItem, isGcssItem, isWorkflowItem, WorkflowItem } from "@/content-scripts/pending-replies/dataWrapper";
import {
    GCSSMessage,
    GCSSNotification,
    GCSSWorkflow,
    isGCSSMessage,
    isGCSSNotification,
} from "@/content-scripts/pending-replies/newGcssWrapper";
async function whenNotificationClicked() {
    const tab = await chrome.tabs.getCurrent();
    console.log(`[whenNotificationClicked] Current tab: `, tab);
    if (tab) {
        console.log(`[whenNotificationClicked] Tab's window: `, await chrome.windows.get(tab.windowId));
        await chrome.windows.update(tab.windowId, { drawAttention: true });
        await chrome.action.openPopup({ windowId: tab.windowId });
    }
}
chrome.notifications.onClicked.addListener(() => {
    whenNotificationClicked();
});

chrome.notifications.onButtonClicked.addListener(() => {
    whenNotificationClicked();
});
async function checkFetchError() {
    type FetchError = {
        ICARE: boolean;
        GCSS: boolean;
    };
    const err: FetchError | undefined = (await chrome.storage.session.get("FETCH_ERROR")).FETCH_ERROR as FetchError;
    if (!err) return false;
    if (err.GCSS || err.ICARE) {
        return err;
    }
    return false;
}

interface StorageItem {
    key: string;
    items: WorkflowItem[] | GcssItem[];
    setting: boolean;
}

export async function getStorageItems<T>(key: string): Promise<T[]> {
    const dict = await chrome.storage.session.get(key);
    return (dict[key] as T[]) || [];
}
async function gatherStorageItems(items: StorageItem[]): Promise<(WorkflowItem | GcssItem | GCSSMessage)[]> {
    const results: (WorkflowItem | GcssItem | GCSSMessage)[] = [];

    for (const item of items) {
        if (!item.setting) continue;
        const storedItems = await getStorageItems<WorkflowItem | GcssItem | GCSSWorkflow | GCSSNotification>(item.key);
        if (Array.isArray(storedItems)) {
            results.push(...storedItems);
        }
    }

    return results;
}

function mapToNotificationItem(item: WorkflowItem | GcssItem | GCSSMessage): chrome.notifications.NotificationItem {
    const isOutbound = (isWorkflowItem(item) ? item.trackingId : item.itemId).slice(-2) === "KR";

    if (isGcssItem(item)) {
        // Old GCSS format
        const thisItem = new GcssItem(item);
        if (thisItem.messageType === "NQ") {
            return {
                title: `GCSS NQ ${isOutbound ? "발송" : "도착"}`,
                message: `${thisItem.itemId} ${isOutbound ? "(" + thisItem.originCountry + ")" : ""}`,
            };
        }
        return {
            title: `GCSS ${thisItem.workflowLevel} ${isOutbound ? "발송" : "도착"}`,
            message: `${thisItem.itemId} ${isOutbound ? "(" + thisItem.destinationCountry + ")" : ""}`,
        };
    } else if (isGCSSMessage(item)) {
        // New GCSS format
        if (isGCSSNotification(item)) {
            return {
                title: `N-GCSS NQ ${isOutbound ? "발송" : "도착"}`,
                message: `${item.itemId} ${isOutbound ? "(" + item.sendingCountry + ")" : ""}`,
            };
        }
        return {
            title: `N-GCSS ${item.inquiryType} ${isOutbound ? "발송" : "도착"}`,
            message: `${item.itemId} ${isOutbound ? "(" + item.sendingCountry + ")" : ""}`,
        };
    } else {
        // iCare format
        if (item.isNotification) {
            return {
                title: `iCare NQ ${isOutbound ? "발송" : "도착"}`,
                message: `${item.trackingId} ${isOutbound ? "(" + item.requestingOperator.substring(0, 2) + ")" : ""}`,
            };
        }
        return {
            title: `iCare L${item.currentLevel} ${isOutbound ? "발송" : "도착"}`,
            message: `${item.trackingId} ${isOutbound ? "(" + item.replyingOperator.substring(0, 2) + ")" : ""}`,
        };
    }
}

export default async function createNotification(force_update = false) {
    const settings = new IMICSettings();
    await settings.loadOptions();
    const fetch_error = await checkFetchError();

    // Define storage items to fetch
    const icareItems: StorageItem[] = [
        { key: CMD.ICARE_UNREAD_REPLIES, setting: settings.IcareUnreadReplies, items: [] },
        { key: CMD.ICARE_UNREAD_REQUESTS, setting: settings.IcareUnreadRequests, items: [] },
        {
            key: CMD.ICARE_UNREAD_NOTIF_INBOUND,
            setting: settings.IcareUnreadNotificationInbound,
            items: [],
        },
        {
            key: CMD.ICARE_UNREAD_NOTIF_OUTBOUND,
            setting: settings.IcareUnreadNotificationOutbound,
            items: [],
        },
    ];

    const gcssItems: StorageItem[] = [
        { key: CMD.GCSS_UNREAD_REPLIES, setting: settings.GcssUnreadReplies, items: [] },
        { key: CMD.GCSS_UNREAD_REQUESTS, setting: settings.GcssUnreadRequests, items: [] },
        {
            key: CMD.GCSS_UNREAD_NOTIF_INBOUND,
            setting: settings.GcssUnreadNotificationInbound,
            items: [],
        },
        {
            key: CMD.GCSS_UNREAD_NOTIF_OUTBOUND,
            setting: settings.GcssUnreadNotificationOutbound,
            items: [],
        },
    ];

    const newGcssItems: StorageItem[] = [
        { key: CMD.NEW_GCSS_UNREAD_REPLIES, setting: settings.GcssUnreadReplies, items: [] },
        { key: CMD.NEW_GCSS_UNREAD_REQUESTS, setting: settings.GcssUnreadRequests, items: [] },
        {
            key: CMD.NEW_GCSS_UNREAD_NOTIF_INBOUND,
            setting: settings.GcssUnreadNotificationInbound,
            items: [],
        },
        {
            key: CMD.NEW_GCSS_UNREAD_NOTIF_OUTBOUND,
            setting: settings.GcssUnreadNotificationOutbound,
            items: [],
        },
    ];

    // Fetch and combine items
    const workflowItems = await gatherStorageItems(icareItems);
    const gcssStoredItems = await gatherStorageItems(gcssItems);
    const newGcssStoredItems = await gatherStorageItems(newGcssItems);

    const current_num = workflowItems.length + gcssStoredItems.length + newGcssStoredItems.length;
    const last_num = parseInt(await chrome.action.getBadgeText({})) || 0;

    console.log("current number: ", current_num, "  last number: ", last_num);

    // Update badge
    if (last_num >= current_num) {
        const item_count = current_num > 0 ? current_num.toString() : "";
        if (!fetch_error) await chrome.action.setBadgeText({ text: item_count });
        if (!force_update) return;
    } else {
        await chrome.action.setBadgeText({ text: `${current_num}` });
    }

    // if (fetch_error) return;

    // Map items to notification format
    const combined = [...gcssStoredItems, ...workflowItems, ...newGcssStoredItems].map(mapToNotificationItem);
    if (combined.length < 1) return;

    // Create notification
    const err_msg = fetch_error ? (fetch_error.GCSS ? "(GCSS 에러)\n" : "(i-Care 에러)\n") : "";

    const options: chrome.notifications.NotificationCreateOptions = {
        type: "list",
        priority: 2,
        requireInteraction: true,
        iconUrl: "icon.png",
        title: `${err_msg}IMIC 알림: ${current_num}개 메시지 대기`,
        message: `GCSS/iCare 읽지 않은 메시지가 ${current_num}개 있습니다.`,
        contextMessage: `GCSS/Icare unread replies: ${current_num}`,
        items: combined,
        buttons: [{ title: "확인" }],
    };

    if (!force_update) {
        void chrome.notifications.create(String(CMD.ICARE_UNREAD_REPLIES), options);
        return;
    }

    chrome.notifications.clear(String(CMD.ICARE_UNREAD_REPLIES), () => {
        // ensure we call the overload that accepts (notificationId: string, options: NotificationCreateOptions)
        // and satisfy TypeScript by asserting the options shape
        void chrome.notifications.create(String(CMD.ICARE_UNREAD_REPLIES), options);
    });
    return true;
}
