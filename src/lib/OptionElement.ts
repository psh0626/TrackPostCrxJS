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
    GcssOutboundNotificationDate: string | null = null;
    GcssOutboundNotificationCountries: string[] = [];
    GcssOutboundNotificationExcludedCountries: string[] = [];
    GcssAuthor: string[] = [];
    GcssServiceTypes: ServiceTypes[] = [ServiceTypes.EMS];
    static SavingFinished: NodeJS.Timeout | null = null;
    private async NotifyTabs() {
        const work_tabs = await chrome.tabs.query({
            url: ["https://icare.post/*", "https://gcss.ipc.be/*"],
            status: "complete",
        });
        if (!work_tabs || !Array.isArray(work_tabs)) {
            return;
        }
        const [firstIcareTab] = work_tabs.filter((tab) => tab.url?.includes("icare.post"));
        const [firstGcssTab] = work_tabs.filter((tab) => tab.url?.includes("gcss.ipc.be"));

        if (firstIcareTab) void chrome.tabs.reload(firstIcareTab.id!);
        if (firstGcssTab) void chrome.tabs.reload(firstGcssTab.id!);

        work_tabs.forEach(async (tab) => {
            if (tab.id && tab.id !== firstIcareTab?.id && tab.id !== firstGcssTab?.id) {
                await chrome.tabs.sendMessage(tab.id, new Msg(COMMANDS.SETTINGS_CHANGED));
            }
        });
    }
    async SaveOptions(immediately: boolean = true) {
        const saveFunc = async () => {
            await chrome.storage.local.set({ IMICSettings: this });
            console.trace("Options Saved as ", this);
            await this.NotifyTabs();
            IMICSettings.SavingFinished = null;
        };
        if (immediately) {
            await saveFunc();
            return;
        }
        if (IMICSettings.SavingFinished) clearTimeout(IMICSettings.SavingFinished);
        IMICSettings.SavingFinished = setTimeout(() => {
            void saveFunc();
        }, 1000);
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
