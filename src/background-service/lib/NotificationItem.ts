type NotificationCreateOptions = chrome.notifications.NotificationCreateOptions;
type NotificationItemData = { notificationId?: string } & SetRequired<
    chrome.notifications.NotificationOptions,
    "title" | "message"
>;

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
    iconUrl: string = "icon.png";
    constructor(obj: NotificationItemData) {
        Object.assign(this, obj);
        this.title = obj.title;
        this.message = obj.message;
        this.notificationId = obj.notificationId ?? "IMIC_NOTIFICATION";
        this.type = obj.type ?? "basic";
        this.iconUrl = obj.iconUrl ?? "icon.png";
    }
    show() {
        const { notificationId, ...options } = this;
        return chrome.notifications.create(this.notificationId, options);
    }
}
