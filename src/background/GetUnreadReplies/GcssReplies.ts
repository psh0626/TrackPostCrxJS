import { COMMANDS, Msg } from "../../lib/Message";
import { IMICSettings } from "../../lib/OptionElement";
import { GcssItem, GcssRawItem, TrimObject } from "./DataWrapper";

export enum ServiceTypes {
    EMS = "EMS",
    Parcel = "UPU",
    Registered = "REG",
    KPacket = "EXPRES",
}
export enum ServiceNames {
    EMS = "EMS",
    UPU = "소포",
    REG = "REG",
    EXPRES = "LPK",
}
export class GcssAPI {
    static settings: IMICSettings;

    static ScheduleAnotherFetch() {
        setTimeout(async () => {
            await this.FetchReplies();
        }, 15000);
    }
    private static async PostFetch(
        folder: "RPLYRCVD" | "TODO" | "NOTIFRCVD" = "RPLYRCVD",
        serviceType: ServiceTypes[] | string = ServiceTypes.EMS
    ) {
        if (Array.isArray(serviceType)) serviceType = serviceType.join('", "');
        return await fetch("https://gcss.ipc.be/CSS/gcss/list-tasks", {
            headers: {
                accept: "application/json, text/plain, */*",
                "content-type": "application/json;charset=UTF-8",
            },
            referrer: "https://gcss.ipc.be/CSS/gcss/product-view/EMS",
            body: `{"folder":"${folder}","products":["${serviceType}"],"refresh":true}`,
            method: "POST",
            credentials: "include",
        });
    }
    private static async FetchNotifications() {
        if (
            !this.settings.GcssUnreadNotificationInbound &&
            !this.settings.GcssUnreadNotificationOutbound
        ) {
            return;
        }

        const response = await this.PostFetch("NOTIFRCVD", ServiceTypes.EMS);

        if (!response.ok) {
            console.error(response.status);
            return;
        }

        const trimmed = TrimObject(await response.json()) as GcssRawItem[];
        console.log("GCSS NOTIFICATIONS FETCHED: ", trimmed);

        const unread = trimmed
            .filter(
                (item) =>
                    item.messageType === "NQ" &&
                    (item.readStatus === "UNREAD" || item.readStatus === "MARKED_UNREAD")
            )
            .map((item) => GcssItem.FromRawItem(item));
        console.log("GCSS NOTIFICATIONS FILTERED: ", unread);

        if (this.settings.GcssUnreadNotificationInbound) {
            const inbound = unread.filter((item) => item.ItemId.slice(-2) !== "KR");
            console.log("GCSS NOTIFICATIONS INOUND: ", inbound);
            await chrome.runtime.sendMessage(new Msg(COMMANDS.GCSS_UNREAD_NOTIF_INBOUND, inbound));
        }
        if (this.settings.GcssUnreadNotificationOutbound) {
            const outbound = unread.filter((item) => item.ItemId.slice(-2) === "KR");
            console.log("GCSS NOTIFICATIONS OUTBOUND: ", outbound);
            await chrome.runtime.sendMessage(
                new Msg(COMMANDS.GCSS_UNREAD_NOTIF_OUTBOUND, outbound)
            );
        }
    }
    private static async FetchRequests() {
        const response = await this.PostFetch("TODO", ServiceTypes.EMS);
        if (!response.ok) {
            console.error(response.status);
            return;
        }
        const trimmed = TrimObject(await response.json()) as GcssRawItem[];
        console.log("GCSS REQUESTS FETCHED: ", trimmed);

        const unread = trimmed
            .filter((item) => item.readStatus === "UNREAD" || item.readStatus === "MARKED_UNREAD")
            .map((item) => GcssItem.FromRawItem(item));
        console.log("GCSS REQUESTS FILTERED: ", unread);

        await chrome.runtime.sendMessage(new Msg(COMMANDS.GCSS_UNREAD_REQUESTS, unread));
    }
    private static IncludesOneOf(target: string, search_strings: string[]) {
        return search_strings.some((item) => target.toLowerCase().includes(item.toLowerCase()));
    }
    static async FetchReplies(repeat: boolean = true) {
        if (!this.settings.GcssUnreadReplies) {
            if (this.settings.GcssUnreadRequests) {
                await this.FetchRequests();
                await this.FetchNotifications();
            }
            return;
        }

        console.log("fetching GCSS replies with settings: ", this.settings.GcssServiceTypes);

        const response = await this.PostFetch("RPLYRCVD", this.settings.GcssServiceTypes); // TODO: 선택하는대로 추가시키기..
        if (!response.ok) {
            console.error(response.status);
            if (this.settings.GcssUnreadReplies)
                await chrome.runtime.sendMessage(new Msg(COMMANDS.GCSS_UNREAD_REPLIES, "?GCSS"));
            //this.ScheduleAnotherFetch();
            return;
        }
        const fetched_obj = TrimObject(await response.json()) as GcssRawItem[];
        console.log("GCSS REPLIES FETCHED: ", fetched_obj);

        const my_msgs = fetched_obj.filter(
            (item) =>
                this.IncludesOneOf(item.requestAuthor, this.settings.GcssAuthor) &&
                this.IncludesOneOf(item.product, this.settings.GcssServiceTypes)
        );
        console.log("My Messages: ", my_msgs);

        const unread_msgs = my_msgs
            .filter((item) => item.readStatus === "UNREAD" || item.readStatus === "MARKED_UNREAD")
            .map((item) => GcssItem.FromRawItem(item));
        console.log("GCSS REPLIES FILTERED: ", unread_msgs);

        await chrome.runtime.sendMessage(new Msg(COMMANDS.GCSS_UNREAD_REPLIES, unread_msgs));

        if (this.settings.GcssUnreadRequests) await this.FetchRequests();
        await this.FetchNotifications();

        if (repeat) this.ScheduleAnotherFetch();
    }
}
