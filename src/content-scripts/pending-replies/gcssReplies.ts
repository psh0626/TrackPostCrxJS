import dayjs from "dayjs";
import { IMICSettings } from "../../lib/IMICSettings";
import { CMD, MSG } from "../../lib/message-hub/Message";
import { GcssItem, GcssRawItem, trimObject } from "./dataWrapper";

export enum ServiceTypes {
    EMS = "EMS",
    Parcel = "UPU",
    Registered = "REG",
    KPacket = "EXPRES",
    Insured = "INS",
}
export enum ServiceNames {
    EMS = "EMS",
    UPU = "소포",
    REG = "REG",
    EXPRES = "LPK",
    INS = "보험",
}
export class GcssAPI {
    static settings: IMICSettings;

    private static async PostFetch(
        folder: "RPLYRCVD" | "TODO" | "NOTIFRCVD" = "RPLYRCVD",
        serviceType: ServiceTypes[] | string = ServiceTypes.EMS,
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
        const isInboundNotiOn = this.settings.GcssUnreadRequests && this.settings.GcssUnreadNotificationInbound;
        if (!isInboundNotiOn && !this.settings.GcssUnreadNotificationOutbound) {
            return;
        }

        const response = await this.PostFetch("NOTIFRCVD", ServiceTypes.EMS);

        if (!response.ok) {
            console.error(response.status);
            return;
        }

        const trimmed = trimObject(await response.json()) as GcssRawItem[];
        console.log("GCSS NOTIFICATIONS FETCHED: ", trimmed);

        const unread = trimmed
            .filter(
                (item) =>
                    item.messageType === "NQ" && (item.readStatus === "UNREAD" || item.readStatus === "MARKED_UNREAD"),
            )
            .map((item) => GcssItem.FromRawItem(item));
        console.log("GCSS NOTIFICATIONS FILTERED: ", unread);

        if (isInboundNotiOn) {
            const inbound = unread.filter((item) => item.itemId.slice(-2) !== "KR");
            console.log("GCSS NOTIFICATIONS INOUND: ", inbound);
            await new MSG(CMD.GCSS_UNREAD_NOTIF_INBOUND, inbound).fromContent.toService();
        }
        if (this.settings.GcssUnreadNotificationOutbound) {
            let outbound = unread.filter((item) => item.itemId.slice(-2) === "KR");
            console.log("GCSS NOTIFICATIONS OUTBOUND: ", outbound);

            if (this.settings.GcssOutboundNotificationCountries.length > 0) {
                outbound = outbound.filter((item) =>
                    this.IncludesOneOf(item.originCountry, this.settings.GcssOutboundNotificationCountries),
                );
                console.log("GCSS NOTIFICATIONS OUTBOUND COUNTRIES FILTERED: ", outbound);
            }
            if (this.settings.GcssOutboundNotificationExcludedCountries.length > 0) {
                outbound = outbound.filter(
                    (item) =>
                        !this.IncludesOneOf(
                            item.originCountry,
                            this.settings.GcssOutboundNotificationExcludedCountries,
                        ),
                );
                console.log("GCSS NOTIFICATIONS OUTBOUND EXCLUDED COUNTRIES FILTERED: ", outbound);
            }

            if (this.settings.GcssOutboundNotificationDate) {
                outbound = outbound.filter((item) => {
                    const created = dayjs(item.notificationCreationDate, "MM/dd").set("year", dayjs().year());
                    return created.isSame(dayjs(this.settings.GcssOutboundNotificationDate), "week");
                });
                console.log("GCSS NOTIFICATIONS OUTBOUND DATE FILTERED: ", outbound);
            }

            await new MSG(CMD.GCSS_UNREAD_NOTIF_OUTBOUND, outbound).fromContent.toService();
        }
    }
    private static async FetchRequests() {
        const response = await this.PostFetch("TODO", this.settings.GcssRequestServiceTypes);
        if (!response.ok) {
            console.error(response.status);
            return;
        }
        const trimmed = trimObject(await response.json()) as GcssRawItem[];
        console.log("GCSS REQUESTS FETCHED: ", trimmed);

        const unread = trimmed
            .filter((item) => item.readStatus === "UNREAD" || item.readStatus === "MARKED_UNREAD")
            .map((item) => GcssItem.FromRawItem(item));
        console.log("GCSS REQUESTS FILTERED: ", unread);

        await new MSG(CMD.GCSS_UNREAD_REQUESTS, unread).fromContent.toService();
    }
    private static IncludesOneOf(target: string, search_strings: string[]) {
        return search_strings.some((item) => target.toLowerCase().includes(item.toLowerCase()));
    }
    static async FetchReplies() {
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
                await new MSG(CMD.GCSS_UNREAD_REPLIES, "?GCSS").fromContent.toService();
            return;
        }
        const fetched_obj = trimObject(await response.json()) as GcssRawItem[];
        console.log("GCSS REPLIES FETCHED: ", fetched_obj);

        const my_msgs = fetched_obj.filter(
            (item) =>
                (this.settings.GcssAuthor.length === 0 ||
                    this.IncludesOneOf(item.requestAuthor, this.settings.GcssAuthor)) &&
                this.IncludesOneOf(item.product, this.settings.GcssServiceTypes),
        );
        console.log("My Messages: ", my_msgs);

        const unread_msgs = my_msgs
            .filter((item) => item.readStatus === "UNREAD" || item.readStatus === "MARKED_UNREAD")
            .map((item) => GcssItem.FromRawItem(item));
        console.log("GCSS REPLIES FILTERED: ", unread_msgs);

        await new MSG(CMD.GCSS_UNREAD_REPLIES, unread_msgs).fromContent.toService();

        if (this.settings.GcssUnreadRequests) await this.FetchRequests();
        await this.FetchNotifications();
    }
}
