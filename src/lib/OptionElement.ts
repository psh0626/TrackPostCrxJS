import { Dayjs } from "dayjs";
import { ServiceTypes } from "../background/GetUnreadReplies/GcssReplies";
import { COMMANDS, Msg, SendRequest } from "./Message";
export class PersonalRemark {
    Section: string;
    Id: number;
    Title: string;
    Content: string;

    constructor(title: string, content: string, id: number, section: string = "REQ") {
        this.Section = section;
        this.Id = id;
        this.Title = title;
        this.Content = content;
    }
}
export class IMICSettings {
    IcareUnreadReplies = false;
    IcareUnreadRequests: boolean = false;
    IcareUnreadNotificationInbound = false;
    IcareUnreadNotificationOutbound = false;
    IcareOutboundNotificationDate: string | null = null;
    IcareOutboundNotificationCountries: string[] = [];
    IcareOutboundNotificationExcludedCountries: string[] = [];
    IcareAuthor: string[] = [];
    PersonalRemarks: PersonalRemark[] = [];
    GcssUnreadReplies = false;
    GcssUnreadRequests = false;
    GcssUnreadNotificationInbound = false;
    GcssUnreadNotificationOutbound = false;
    GcssOutboundNotificatioDate: string | null = null;
    GcssOutboundNotificationCountries: string[] = [];
    GcssOutboundNotificationExcludedCountries: string[] = [];
    GcssAuthor: string[] = [];
    GcssServiceTypes: ServiceTypes[] = [ServiceTypes.EMS];
    SavingFinished: NodeJS.Timeout | null = null;
    private async NotifyTabs() {
        const work_tabs = await chrome.tabs.query({
            url: ["https://icare.post/*", "https://gcss.ipc.be/*"],
            status: "complete",
        });
        if (!work_tabs || !Array.isArray(work_tabs)) {
            return;
        }
        work_tabs.forEach(async (tab) => {
            if (tab.id) await chrome.tabs.sendMessage(tab.id, new Msg(COMMANDS.SETTINGS_CHANGED));
        });
    }
    async SaveOptions() {
        await chrome.storage.local.set({ IMICSettings: this });
        console.log("Options Saved as ", this);

        if (this.SavingFinished) clearTimeout(this.SavingFinished);
        this.SavingFinished = setTimeout(() => {
            void (async () => {
                await this.NotifyTabs();
            })();
        }, 5000);
    }
    async LoadOptions() {
        const newThis = await chrome.storage.local.get("IMICSettings");
        Object.assign(this, newThis.IMICSettings);
        console.log("Options loaded this: ", this);
    }

    async RequestSave() {
        await SendRequest(new Msg(COMMANDS.SAVE_OPTIONS, this));
    }

    async RequestLoad() {
        Object.assign(this, await SendRequest<IMICSettings>(new Msg(COMMANDS.LOAD_OPTIONS)));
    }
}
