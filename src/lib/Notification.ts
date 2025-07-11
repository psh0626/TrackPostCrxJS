import { GcssItem, WorkflowItem } from "../background/GetUnreadReplies/DataWrapper";
import { COMMANDS } from "./Message";
import { IMICSettings } from "./OptionElement";

async function CheckFetchError() {
    type FetchError = {
        ICARE: boolean;
        GCSS: boolean;
    };
    const err: FetchError = (await chrome.storage.session.get("FETCH_ERROR")).FETCH_ERROR;
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

async function GetStorageItems<T>(key: string): Promise<T[]> {
    const dict = await chrome.storage.session.get(key);
    return (dict[key] as T[]) || [];
}

async function GatherStorageItems(items: StorageItem[]): Promise<(WorkflowItem | GcssItem)[]> {
    const results: (WorkflowItem | GcssItem)[] = [];

    for (const item of items) {
        if (!item.setting) continue;
        const storedItems = await GetStorageItems<WorkflowItem | GcssItem>(item.key);
        if (Array.isArray(storedItems)) {
            results.push(...storedItems);
        }
    }

    return results;
}

function MapToNotificationItem(item: WorkflowItem | GcssItem): chrome.notifications.NotificationItem {
    const isOutbound = ("tracking_id" in item ? item.tracking_id : item.ItemId).slice(-2) === "KR";

    if ("MessageType" in item) {
        // GcssItem
        if (item.MessageType === "NQ") {
            return {
                title: `GCSS NQ ${isOutbound ? "발송" : "도착"}`,
                message: `${item.ItemId} ${isOutbound ? "(" + item.OriginCountry + ")" : ""}`,
            };
        }
        return {
            title: `GCSS ${item.WorkflowLevel} ${isOutbound ? "발송" : "도착"}`,
            message: `${item.ItemId} ${isOutbound ? "(" + item.DestinationCountry + ")" : ""}`,
        };
    }

    // WorkflowItem
    if (item.is_notification) {
        return {
            title: `iCare NQ ${isOutbound ? "발송" : "도착"}`,
            message: `${item.tracking_id} ${isOutbound ? "(" + item.requesting_op.substring(0, 2) + ")" : ""}`,
        };
    }
    return {
        title: `iCare L${item.current_level} ${isOutbound ? "발송" : "도착"}`,
        message: `${item.tracking_id} ${isOutbound ? "(" + item.replying_op.substring(0, 2) + ")" : ""}`,
    };
}

export default async function CreateNotification(force_update = false) {
    const settings = new IMICSettings();
    await settings.LoadOptions();
    const fetch_error = await CheckFetchError();

    // Define storage items to fetch
    const icareItems: StorageItem[] = [
        { key: COMMANDS.ICARE_UNREAD_REPLIES, setting: settings.IcareUnreadReplies, items: [] },
        { key: COMMANDS.ICARE_UNREAD_REQUESTS, setting: settings.IcareUnreadRequests, items: [] },
        {
            key: COMMANDS.ICARE_UNREAD_NOTIF_INBOUND,
            setting: settings.IcareUnreadNotificationInbound,
            items: [],
        },
        {
            key: COMMANDS.ICARE_UNREAD_NOTIF_OUTBOUND,
            setting: settings.IcareUnreadNotificationOutbound,
            items: [],
        },
    ];

    const gcssItems: StorageItem[] = [
        { key: COMMANDS.GCSS_UNREAD_REPLIES, setting: settings.GcssUnreadReplies, items: [] },
        { key: COMMANDS.GCSS_UNREAD_REQUESTS, setting: settings.GcssUnreadRequests, items: [] },
        {
            key: COMMANDS.GCSS_UNREAD_NOTIF_INBOUND,
            setting: settings.GcssUnreadNotificationInbound,
            items: [],
        },
        {
            key: COMMANDS.GCSS_UNREAD_NOTIF_OUTBOUND,
            setting: settings.GcssUnreadNotificationOutbound,
            items: [],
        },
    ];

    // Fetch and combine items
    const workflowItems = await GatherStorageItems(icareItems);
    const gcssStoredItems = await GatherStorageItems(gcssItems);

    const current_num = workflowItems.length + gcssStoredItems.length;
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

    if (fetch_error && !force_update) return;

    // Map items to notification format
    const combined = [...gcssStoredItems, ...workflowItems].map(MapToNotificationItem);
    if (combined.length < 1) return;

    // Create notification
    const err_msg = fetch_error ? (fetch_error.GCSS ? "(GCSS 에러)\n" : "(i-Care 에러)\n") : "";

    const options: chrome.notifications.NotificationCreateOptions = {
        type: "list",
        priority: 2,
        requireInteraction: true,
        iconUrl: "src/ext-icon.png",
        title: `${err_msg}IMIC 알림: ${current_num}개 메시지 대기`,
        message: `GCSS/iCare 읽지 않은 메시지가 ${current_num}개 있습니다.`,
        contextMessage: `GCSS/Icare unread replies: ${current_num}`,
        items: combined,
        buttons: [{ title: "확인" }],
    };

    chrome.notifications.clear(COMMANDS.ICARE_UNREAD_REPLIES, () => {
        chrome.notifications.create(COMMANDS.ICARE_UNREAD_REPLIES, options);
    });
    return true;
}
