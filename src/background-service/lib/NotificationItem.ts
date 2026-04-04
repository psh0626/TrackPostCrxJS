type NotificationCreateOptions = chrome.notifications.NotificationCreateOptions;
type NotificationItemData = Omit<NotificationItem, "show">;

export default class NotificationItem implements NotificationCreateOptions {
    appIconMaskUrl?: string | undefined;
    buttons?: chrome.notifications.NotificationButton[] | undefined;
    contextMessage?: string | undefined;
    eventTime?: number | undefined;
    imageUrl?: string | undefined;
    isClickable?: boolean | undefined;
    items?: chrome.notifications.NotificationItem[] | undefined;
    priority?: number | undefined;
    progress?: number | undefined;
    requireInteraction?: boolean | undefined;
    silent?: boolean | undefined;
    notificationId: string;
    type: "progress" | "list" | "basic" | "image";
    title: string;
    message: string;
    iconUrl: string;
    constructor(obj: NotificationItemData) {
        this.notificationId = obj.notificationId;
        this.title = obj.title;
        this.message = obj.message;
        this.type = obj.type;
        this.iconUrl = obj.iconUrl ?? "icon.png";
    }
    show() {
        return chrome.notifications.create(this.notificationId, this);
    }
}
