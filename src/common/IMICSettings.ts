import { ServiceTypes } from "../content-scripts/pending-replies/gcssReplies";
import { requestFetch } from "./findTabs";
import { CMD, MSG } from "./message-hub/Message";
import StorageKey from "./StorageKey";

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
        await new MSG(CMD.SETTINGS_CHANGED).fromService.notifyAllTabs();

        await requestFetch();
        IMICSettings.SavingFinished = null;
    }
    async saveOptions(immediately: boolean = true) {
        const saveFunc = async () => {
            await new StorageKey("IMICSettings").fromLocal.set(this);
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
        const newThis = await new StorageKey("IMICSettings").fromLocal.get<IMICSettings>();
        Object.assign(this, newThis);
        console.log("Options loaded this: ", this);
    }

    async requestSave() {
        await new MSG(CMD.SAVE_OPTIONS, this).fromContent.toService();
    }

    async requestLoad() {
        Object.assign(this, await new MSG(CMD.LOAD_OPTIONS).fromContent.toServiceWaitResponse<IMICSettings>());
    }
}
