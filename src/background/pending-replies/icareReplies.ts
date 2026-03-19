import dayjs from "dayjs";
import { IMICSettings } from "../../lib/IMICSettings";
import { COMMANDS, MSG } from "../../lib/Message";
import { IcareResponse, WorkflowItem } from "./dataWrapper";

export class IcareAPI2 {
    static LastCsrfToken: string = "";
    //static UserId: string = "";
    static settings = new IMICSettings();
    static readonly BASE_URL = "https://icare.post/?module=workflow&tab=active";
    static readonly BASE_NOTIF_URL = "https://icare.post/?module=notification&tab=active&origin=received&read=unread";
    static readonly FETCH_URL = "https://icare.post/?module=workflow&tab=active&action=overviewJson&mode=ajax";
    static readonly FETCH_NOTIF_URL =
        "https://icare.post/?module=notification&tab=active&action=overviewJson&mode=ajax";
    static readonly MAX_RETRY_COUNT = 3;
    static readonly RETRY_TIMEOUT_MS = 2 * 1000;
    private static readonly FETCH_HEADERS = {
        accept: "application/json, text/javascript, */*; q=0.01",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "accept-language": "ko,en;q=0.9,en-US;q=0.8,es;q=0.7",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Microsoft Edge";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
    };

    private static async FetchFromAPI(bodyStr: string, notification: boolean = false) {
        return await fetch(notification ? this.FETCH_NOTIF_URL : this.FETCH_URL, {
            method: "POST",
            headers: this.FETCH_HEADERS,
            referrer: notification ? this.BASE_NOTIF_URL : this.BASE_URL,
            referrerPolicy: "strict-origin-when-cross-origin",
            body: bodyStr,
            mode: "cors",
            credentials: "include",
        });
    }
    private static UpdateCsrfToken(newToken: string) {
        this.LastCsrfToken = newToken;
    }
    static async FetchUnreadReplies(csrfToken: string, trialNo = 1, noResponse = 0) {
        if (!this.settings.IcareUnreadReplies) {
            if (this.settings.IcareUnreadRequests) await this.FetchUnreadRequests(this.LastCsrfToken);
            await this.FetchNotifications(this.LastCsrfToken);
            return;
        }

        let response: Response;
        let result: IcareResponse | undefined;
        try {
            const body_combined = this.GetBodyStringForUnreadReplies(this.LastCsrfToken || csrfToken);
            response = await this.FetchFromAPI(body_combined);

            result = (await response.json()) as IcareResponse;
            this.UpdateCsrfToken(result.control.csrfToken);
        } catch (e) {
            //this.LastCsrfToken = "nA1tQy921DGPmaL45z7Bq/W7B3qBICZFO/WB1b189ylvEyVW8qh8";
            console.log(`ICARE FETCH: error`, e);
            console.log("NO RESPONSE", noResponse);
            if (noResponse >= this.MAX_RETRY_COUNT) {
                await chrome.runtime.sendMessage(new MSG(COMMANDS.ICARE_UNREAD_REPLIES, "?ICARE"));
            } else {
                setTimeout(() => {
                    void this.FetchUnreadReplies(this.LastCsrfToken, trialNo, ++noResponse);
                }, this.RETRY_TIMEOUT_MS);
            }
            return;
        }

        if (response.ok) {
            console.log(`[FetchUnreadReplies] Attempt No.${trialNo} successful`, result);
            if (this.settings.IcareUnreadRequests) await this.FetchUnreadRequests(this.LastCsrfToken);
            await this.FetchNotifications(this.LastCsrfToken);
            await this.OnSuccess(result!);
        } else {
            console.log(
                `[FetchUnreadReplies] Attempt No.${trialNo} failed with CSRF Token:`,
                csrfToken,
                "\nResponse:",
                result,
            );

            if (trialNo >= this.MAX_RETRY_COUNT) {
                //this.UpdateCsrfToken(csrfToken);
                await chrome.runtime.sendMessage(new MSG(COMMANDS.ICARE_UNREAD_REPLIES, "?ICARE"));
            } else {
                if (response.status === 403) {
                    setTimeout(() => {
                        void this.FetchUnreadReplies(this.LastCsrfToken, trialNo + 1, noResponse);
                    }, this.RETRY_TIMEOUT_MS);
                } else await this.FetchUnreadReplies(this.LastCsrfToken, trialNo + 1, noResponse);
            }
        }
    }
    private static async FetchUnreadRequests(csrfToken: string) {
        const bodyStr = this.GetBodyStringForUnreadRequests(csrfToken);

        const response = await this.FetchFromAPI(bodyStr);

        let result: IcareResponse | undefined;
        let see_other = false;
        try {
            result = (await response.json()) as IcareResponse;
            this.UpdateCsrfToken(result.control.csrfToken);
        } catch (e) {
            console.error(`[FetchUnreadRequests] Network request failed:`, e);
            see_other = true;
        }

        if (response.ok && !see_other) {
            console.log(`[FetchUnreadRequests] Attempt successful`, result);
            const request_items = result!.content.data.map((data) => new WorkflowItem(data));
            await chrome.runtime.sendMessage(new MSG(COMMANDS.ICARE_UNREAD_REQUESTS, request_items));
        } else {
            console.log(`[FetchUnreadRequests] Attempt failed with CSRF Token:`, csrfToken, "\nResponse:", result);
        }
    }

    private static async FetchNotifications(csrfToken: string) {
        const isInboundNotiOn = this.settings.IcareUnreadRequests && this.settings.IcareUnreadNotificationInbound;
        if (!isInboundNotiOn && !this.settings.IcareUnreadNotificationOutbound) {
            return;
        }
        const bodyStr = this.GetBodyStringForUnreadNotifications(csrfToken);

        const response = await this.FetchFromAPI(bodyStr, true);

        let result: IcareResponse | undefined;
        let see_other = false;
        try {
            result = (await response.json()) as IcareResponse;
            this.UpdateCsrfToken(result.control.csrfToken);
        } catch (e) {
            console.error(`[FetchNotifications] Network request failed:`, e);
            see_other = true;
        }

        if (response.ok && !see_other) {
            console.log(`[FetchNotifications] Attempt successful`, result);
            const notif_items = result!.content.data.map((data) => new WorkflowItem(data));
            if (isInboundNotiOn) {
                const inbound = notif_items.filter((item) => item.trackingId.slice(-2) !== "KR");
                console.log(`[FetchNotifications] Notification inbound items filtered`, inbound);
                await chrome.runtime.sendMessage(new MSG(COMMANDS.ICARE_UNREAD_NOTIF_INBOUND, inbound));
            }
            if (this.settings.IcareUnreadNotificationOutbound) {
                let outbound = notif_items.filter((item) => item.trackingId.slice(-2) === "KR");
                console.log(`[FetchNotifications] Notification outbound items filtered`, outbound);

                if (this.settings.IcareOutboundNotificationCountries.length > 0) {
                    outbound = outbound.filter((item) =>
                        this.IncludesOneOf(item.requestingOperator, this.settings.IcareOutboundNotificationCountries),
                    );
                    console.log(`[FetchNotifications] Notification outbound items countries filtered`, outbound);
                }
                if (this.settings.IcareOutboundNotificationExcludedCountries.length > 0) {
                    outbound = outbound.filter(
                        (item) =>
                            !this.IncludesOneOf(
                                item.requestingOperator,
                                this.settings.IcareOutboundNotificationExcludedCountries,
                            ),
                    );
                    console.log(
                        `[FetchNotifications] Notification outbound items excluded countries filtered`,
                        outbound,
                    );
                }

                if (this.settings.IcareOutboundNotificationDate !== null) {
                    outbound = outbound.filter((item) => {
                        const created = dayjs(item.created, "YYYY-MM-DD HH:mm");
                        console.log(
                            `[FetchNotifications] Notification Created at `,
                            created,
                            ` DateInSettings `,
                            dayjs(this.settings.IcareOutboundNotificationDate),
                        );
                        return created.isSame(dayjs(this.settings.IcareOutboundNotificationDate), "week");
                    });

                    console.log(`[FetchNotifications] Notification outbound DateRange filtered`, outbound);
                }

                await chrome.runtime.sendMessage(new MSG(COMMANDS.ICARE_UNREAD_NOTIF_OUTBOUND, outbound));
            }
        } else {
            console.log(`[FetchNotifications] Attempt failed with CSRF Token:`, csrfToken, "\nResponse:", result);
        }
    }

    private static IncludesOneOf(target: string, search_strings: string[]) {
        const targetLower = target.toLowerCase();
        return search_strings.some((item) => targetLower.includes(item.toLowerCase()));
    }
    private static async OnSuccess(response: IcareResponse) {
        const workflow_items = response.content.data.map((rawdata: object) => new WorkflowItem(rawdata));

        const filtered_items =
            this.settings.IcareAuthor.length === 0
                ? workflow_items
                : workflow_items.filter((e) => this.IncludesOneOf(e.author, this.settings.IcareAuthor));

        console.log(`${workflow_items.length} items fetched:`, filtered_items);

        await chrome.runtime.sendMessage(new MSG(COMMANDS.ICARE_UNREAD_REPLIES, filtered_items));

        const today = new Date();
        console.log(today.toLocaleString(), "\nworkflows sent");
    }

    private static GetBodyStringForUnreadReplies(csrfToken: string): string {
        const bodyData = `draw=4&columns%5B0%5D%5Bdata%5D=0&columns%5B0%5D%5Bname%5D=&columns%5B0%5D%5Bsearchable%5D=true&columns%5B0%5D%5Borderable%5D=false&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=1&columns%5B1%5D%5Bname%5D=&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=false&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=2&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=true&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=3&columns%5B3%5D%5Bname%5D=&columns%5B3%5D%5Bsearchable%5D=true&columns%5B3%5D%5Borderable%5D=true&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D=4&columns%5B4%5D%5Bname%5D=&columns%5B4%5D%5Bsearchable%5D=true&columns%5B4%5D%5Borderable%5D=true&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B5%5D%5Bdata%5D=5&columns%5B5%5D%5Bname%5D=&columns%5B5%5D%5Bsearchable%5D=true&columns%5B5%5D%5Borderable%5D=true&columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B6%5D%5Bdata%5D=6&columns%5B6%5D%5Bname%5D=&columns%5B6%5D%5Bsearchable%5D=true&columns%5B6%5D%5Borderable%5D=true&columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B7%5D%5Bdata%5D=7&columns%5B7%5D%5Bname%5D=&columns%5B7%5D%5Bsearchable%5D=true&columns%5B7%5D%5Borderable%5D=true&columns%5B7%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B7%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B8%5D%5Bdata%5D=8&columns%5B8%5D%5Bname%5D=&columns%5B8%5D%5Bsearchable%5D=true&columns%5B8%5D%5Borderable%5D=false&columns%5B8%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B8%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B9%5D%5Bdata%5D=9&columns%5B9%5D%5Bname%5D=&columns%5B9%5D%5Bsearchable%5D=true&columns%5B9%5D%5Borderable%5D=true&columns%5B9%5D%5Bsearch%5D%5Bvalue%5D=-1&columns%5B9%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B10%5D%5Bdata%5D=10&columns%5B10%5D%5Bname%5D=&columns%5B10%5D%5Bsearchable%5D=true&columns%5B10%5D%5Borderable%5D=true&columns%5B10%5D%5Bsearch%5D%5Bvalue%5D=-1&columns%5B10%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B11%5D%5Bdata%5D=11&columns%5B11%5D%5Bname%5D=&columns%5B11%5D%5Bsearchable%5D=true&columns%5B11%5D%5Borderable%5D=true&columns%5B11%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B11%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B12%5D%5Bdata%5D=12&columns%5B12%5D%5Bname%5D=&columns%5B12%5D%5Bsearchable%5D=true&columns%5B12%5D%5Borderable%5D=true&columns%5B12%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B12%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B13%5D%5Bdata%5D=13&columns%5B13%5D%5Bname%5D=&columns%5B13%5D%5Bsearchable%5D=true&columns%5B13%5D%5Borderable%5D=true&columns%5B13%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B13%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B14%5D%5Bdata%5D=14&columns%5B14%5D%5Bname%5D=&columns%5B14%5D%5Bsearchable%5D=true&columns%5B14%5D%5Borderable%5D=true&columns%5B14%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B14%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B15%5D%5Bdata%5D=15&columns%5B15%5D%5Bname%5D=&columns%5B15%5D%5Bsearchable%5D=true&columns%5B15%5D%5Borderable%5D=true&columns%5B15%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B15%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B15%5D%5Bsearch%5D%5Bmin%5D=&columns%5B15%5D%5Bsearch%5D%5Bmax%5D=&columns%5B16%5D%5Bdata%5D=16&columns%5B16%5D%5Bname%5D=&columns%5B16%5D%5Bsearchable%5D=true&columns%5B16%5D%5Borderable%5D=false&columns%5B16%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B16%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=15&order%5B0%5D%5Bdir%5D=desc&order%5B0%5D%5Bname%5D=&start=0&length=100&search%5Bvalue%5D=&search%5Bregex%5D=false`;
        const bodyConfig = "&origin=requesting&dueDate=-1&postalOperator=-1&read=unread&responsibleUser=-1"; // + this.UserId;
        const bodyCsrfToken = "&csrfToken=" + encodeURIComponent(csrfToken);
        return bodyData + bodyConfig + bodyCsrfToken;
    }
    private static GetBodyStringForUnreadRequests(csrfToken: string): string {
        const bodyData =
            "draw=6&columns%5B0%5D%5Bdata%5D=0&columns%5B0%5D%5Bname%5D=&columns%5B0%5D%5Bsearchable%5D=true&columns%5B0%5D%5Borderable%5D=false&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=1&columns%5B1%5D%5Bname%5D=&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=false&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=2&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=true&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=3&columns%5B3%5D%5Bname%5D=&columns%5B3%5D%5Bsearchable%5D=true&columns%5B3%5D%5Borderable%5D=true&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D=4&columns%5B4%5D%5Bname%5D=&columns%5B4%5D%5Bsearchable%5D=true&columns%5B4%5D%5Borderable%5D=true&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B5%5D%5Bdata%5D=5&columns%5B5%5D%5Bname%5D=&columns%5B5%5D%5Bsearchable%5D=true&columns%5B5%5D%5Borderable%5D=true&columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B6%5D%5Bdata%5D=6&columns%5B6%5D%5Bname%5D=&columns%5B6%5D%5Bsearchable%5D=true&columns%5B6%5D%5Borderable%5D=true&columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B7%5D%5Bdata%5D=7&columns%5B7%5D%5Bname%5D=&columns%5B7%5D%5Bsearchable%5D=true&columns%5B7%5D%5Borderable%5D=true&columns%5B7%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B7%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B8%5D%5Bdata%5D=8&columns%5B8%5D%5Bname%5D=&columns%5B8%5D%5Bsearchable%5D=true&columns%5B8%5D%5Borderable%5D=false&columns%5B8%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B8%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B9%5D%5Bdata%5D=9&columns%5B9%5D%5Bname%5D=&columns%5B9%5D%5Bsearchable%5D=true&columns%5B9%5D%5Borderable%5D=true&columns%5B9%5D%5Bsearch%5D%5Bvalue%5D=-1&columns%5B9%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B10%5D%5Bdata%5D=10&columns%5B10%5D%5Bname%5D=&columns%5B10%5D%5Bsearchable%5D=true&columns%5B10%5D%5Borderable%5D=true&columns%5B10%5D%5Bsearch%5D%5Bvalue%5D=-1&columns%5B10%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B11%5D%5Bdata%5D=11&columns%5B11%5D%5Bname%5D=&columns%5B11%5D%5Bsearchable%5D=true&columns%5B11%5D%5Borderable%5D=true&columns%5B11%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B11%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B12%5D%5Bdata%5D=12&columns%5B12%5D%5Bname%5D=&columns%5B12%5D%5Bsearchable%5D=true&columns%5B12%5D%5Borderable%5D=true&columns%5B12%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B12%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B13%5D%5Bdata%5D=13&columns%5B13%5D%5Bname%5D=&columns%5B13%5D%5Bsearchable%5D=true&columns%5B13%5D%5Borderable%5D=true&columns%5B13%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B13%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B14%5D%5Bdata%5D=14&columns%5B14%5D%5Bname%5D=&columns%5B14%5D%5Bsearchable%5D=true&columns%5B14%5D%5Borderable%5D=true&columns%5B14%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B14%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B15%5D%5Bdata%5D=15&columns%5B15%5D%5Bname%5D=&columns%5B15%5D%5Bsearchable%5D=true&columns%5B15%5D%5Borderable%5D=true&columns%5B15%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B15%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B15%5D%5Bsearch%5D%5Bmin%5D=&columns%5B15%5D%5Bsearch%5D%5Bmax%5D=&columns%5B16%5D%5Bdata%5D=16&columns%5B16%5D%5Bname%5D=&columns%5B16%5D%5Bsearchable%5D=true&columns%5B16%5D%5Borderable%5D=false&columns%5B16%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B16%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=15&order%5B0%5D%5Bdir%5D=desc&start=0&length=100&search%5Bvalue%5D=&search%5Bregex%5D=false";
        const bodyConfig = "&origin=replying&dueDate=-1&postalOperator=-1&read=unread&responsibleUser=-1";
        const bodyCsrfToken = "&csrfToken=" + encodeURIComponent(csrfToken);
        return bodyData + bodyConfig + bodyCsrfToken;
    }
    private static GetBodyStringForUnreadNotifications(csrfToken: string): string {
        const bodyData =
            "draw=2&columns%5B0%5D%5Bdata%5D=0&columns%5B0%5D%5Bname%5D=&columns%5B0%5D%5Bsearchable%5D=true&columns%5B0%5D%5Borderable%5D=false&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=1&columns%5B1%5D%5Bname%5D=&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=2&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=false&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=3&columns%5B3%5D%5Bname%5D=&columns%5B3%5D%5Bsearchable%5D=true&columns%5B3%5D%5Borderable%5D=true&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D=4&columns%5B4%5D%5Bname%5D=&columns%5B4%5D%5Bsearchable%5D=true&columns%5B4%5D%5Borderable%5D=true&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B5%5D%5Bdata%5D=5&columns%5B5%5D%5Bname%5D=&columns%5B5%5D%5Bsearchable%5D=true&columns%5B5%5D%5Borderable%5D=true&columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B6%5D%5Bdata%5D=6&columns%5B6%5D%5Bname%5D=&columns%5B6%5D%5Bsearchable%5D=true&columns%5B6%5D%5Borderable%5D=true&columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B7%5D%5Bdata%5D=7&columns%5B7%5D%5Bname%5D=&columns%5B7%5D%5Bsearchable%5D=true&columns%5B7%5D%5Borderable%5D=true&columns%5B7%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B7%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B8%5D%5Bdata%5D=8&columns%5B8%5D%5Bname%5D=&columns%5B8%5D%5Bsearchable%5D=true&columns%5B8%5D%5Borderable%5D=true&columns%5B8%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B8%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B9%5D%5Bdata%5D=9&columns%5B9%5D%5Bname%5D=&columns%5B9%5D%5Bsearchable%5D=true&columns%5B9%5D%5Borderable%5D=true&columns%5B9%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B9%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B10%5D%5Bdata%5D=10&columns%5B10%5D%5Bname%5D=&columns%5B10%5D%5Bsearchable%5D=true&columns%5B10%5D%5Borderable%5D=true&columns%5B10%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B10%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B11%5D%5Bdata%5D=11&columns%5B11%5D%5Bname%5D=&columns%5B11%5D%5Bsearchable%5D=true&columns%5B11%5D%5Borderable%5D=true&columns%5B11%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B11%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B12%5D%5Bdata%5D=12&columns%5B12%5D%5Bname%5D=&columns%5B12%5D%5Bsearchable%5D=true&columns%5B12%5D%5Borderable%5D=true&columns%5B12%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B12%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B12%5D%5Bsearch%5D%5Bmin%5D=&columns%5B12%5D%5Bsearch%5D%5Bmax%5D=&columns%5B13%5D%5Bdata%5D=13&columns%5B13%5D%5Bname%5D=&columns%5B13%5D%5Bsearchable%5D=true&columns%5B13%5D%5Borderable%5D=false&columns%5B13%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B13%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=12&order%5B0%5D%5Bdir%5D=desc&order%5B0%5D%5Bname%5D=";
        const bodyConfig =
            "&start=0&length=50&search%5Bvalue%5D=&search%5Bregex%5D=false&origin=received&postalOperator=-1&read=unread";
        const bodyCsrfToken = "&csrfToken=" + encodeURIComponent(csrfToken);
        return bodyData + bodyConfig + bodyCsrfToken;
    }
}
