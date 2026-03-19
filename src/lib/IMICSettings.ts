import { ServiceTypes } from "../background/pending-replies/gcssReplies";
import { COMMANDS, MSG, sendRequest } from "./Message";
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
    GcssRequestServiceTypes: ServiceTypes[] = [ServiceTypes.EMS];
    GcssUnreadNotificationInbound = false;
    GcssUnreadNotificationOutbound = false;
    GcssOutboundNotificationDate: string | null = null;
    GcssOutboundNotificationCountries: string[] = [];
    GcssOutboundNotificationExcludedCountries: string[] = [];
    GcssAuthor: string[] = [];
    GcssServiceTypes: ServiceTypes[] = [ServiceTypes.EMS];
    static SavingFinished: NodeJS.Timeout | null = null;
    private async notifyTabs() {
        const work_tabs = await chrome.tabs.query({
            url: ["https://icare.post/*", "https://gcss.ipc.be/*", "https://gcss-uat.ipc.be/*"],
            status: "complete",
        });
        if (!work_tabs || !Array.isArray(work_tabs)) {
            return;
        }
        const [firstIcareTab] = work_tabs.filter((tab) => tab.url?.includes("icare.post"));
        const [firstOldGcssTab] = work_tabs.filter((tab) => tab.url?.includes("gcss.ipc.be"));
        const [firstNewGcssTab] = work_tabs.filter((tab) => tab.url?.includes("gcss-uat.ipc.be"));

        if (firstIcareTab) void chrome.tabs.reload(firstIcareTab.id!);
        if (firstOldGcssTab) void chrome.tabs.reload(firstOldGcssTab.id!);
        if (firstNewGcssTab) void chrome.tabs.reload(firstNewGcssTab.id!);

        work_tabs.forEach(async (tab) => {
            if (
                tab.id &&
                tab.id !== firstIcareTab?.id &&
                tab.id !== firstOldGcssTab?.id &&
                tab.id !== firstNewGcssTab?.id
            ) {
                await chrome.tabs.sendMessage(tab.id, new MSG(COMMANDS.SETTINGS_CHANGED));
            }
        });
        IMICSettings.SavingFinished = null;
    }
    async saveOptions(immediately: boolean = true) {
        const saveFunc = async () => {
            await chrome.storage.local.set({ IMICSettings: this });
            console.log("Options Saved as ", this);
            if (IMICSettings.SavingFinished) clearTimeout(IMICSettings.SavingFinished);
            IMICSettings.SavingFinished = setTimeout(this.notifyTabs, 4000);
        };
        if (immediately) {
            await saveFunc();
            return;
        }
        if (IMICSettings.SavingFinished) clearTimeout(IMICSettings.SavingFinished);
        IMICSettings.SavingFinished = setTimeout(() => {
            void saveFunc();
        }, 2000);
    }
    async loadOptions() {
        const newThis = await chrome.storage.local.get("IMICSettings");
        Object.assign(this, newThis.IMICSettings);
        console.log("Options loaded this: ", this);
    }

    async requestSave() {
        await sendRequest(new MSG(COMMANDS.SAVE_OPTIONS, this));
    }

    async requestLoad() {
        Object.assign(this, await sendRequest<IMICSettings>(new MSG(COMMANDS.LOAD_OPTIONS)));
    }
}
