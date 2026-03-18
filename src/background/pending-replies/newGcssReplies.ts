import { IMICSettings } from "../../lib/IMICSettings";
import { COMMANDS, MSG } from "../../lib/Message";
import { GcssResponse, GCSSWorkflow } from "./newGcssWrapper";

type ViewType = "TODOS" | "REQUEST_SENT" | "REPLY_SENT" | "REPLY_RECEIVED";
class GcssWorkflowClient {
    private baseUrl = "https://gcss-uat.ipc.be/ui-gtw/api/workflows";
    private defaultParams = {
        products: "EMS,EXPRES,REG,INS,UPU,PREMIUM,STAND2,STAND30",
        sort_by: "DUE_DATE",
        sort_direction: "ASC",
    };

    async getWorkflows(
        view: ViewType,
        page: number = 1,
        size: number = 500,
        params: Partial<typeof this.defaultParams> = {},
    ) {
        const url = new URL(this.baseUrl);
        const finalParams = { view, ...this.defaultParams, ...params };

        Object.entries(finalParams).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
        url.searchParams.append("page", page.toString());
        url.searchParams.append("size", size.toString());

        const response = await fetch(url.toString());
        return response.json() as unknown as GcssResponse;
    }
}
export class GcssWorkflowService {
    private static client = new GcssWorkflowClient();
    static settings = new IMICSettings();
    static async fetchWorkflows() {
        const messages = [];
        if (this.settings.GcssUnreadRequests) {
            const workflows = await this.getResponseData("TODOS");
            console.log("Filtering TODOS workflows with settings", this.settings.GcssRequestServiceTypes);

            const filteredWorkflows = this.filterByUserSettings(workflows, (wf) =>
                this.includesOneOf(wf.product, this.settings.GcssServiceTypes),
            );

            const unreadWorkflows = this.filterUnread(filteredWorkflows);

            if (unreadWorkflows) messages.push(this.notifyMessageHub(COMMANDS.GCSS_UNREAD_REQUESTS, unreadWorkflows));
        }

        if (this.settings.GcssUnreadReplies) {
            const workflows = await this.getResponseData("REPLY_RECEIVED");
            console.log(
                "Filtering REPLY_RECEIVED workflows with settings",
                this.settings.GcssAuthor,
                this.settings.GcssServiceTypes,
            );

            const filteredWorkflows = this.filterByUserSettings(workflows, [
                (wf) => this.includesOneOf(wf.inquiryAuthorName, this.settings.GcssAuthor),
                (wf) => this.includesOneOf(wf.product, this.settings.GcssServiceTypes),
            ]);

            const unreadWorkflows = this.filterUnread(filteredWorkflows);

            if (unreadWorkflows) messages.push(this.notifyMessageHub(COMMANDS.GCSS_UNREAD_REPLIES, unreadWorkflows));
        }

        if (this.settings.GcssUnreadNotificationInbound) {
        }

        if (this.settings.GcssUnreadNotificationOutbound) {
        }

        if (messages.length > 0) {
            await Promise.all(messages);
        }
    }

    private static filterUnread(workflows: GCSSWorkflow[] | undefined) {
        const filtered = workflows?.filter((workflow) => workflow.readStatus === "UNREAD");
        console.log("Filtered unread workflows", filtered);
        return filtered;
    }

    private static filterByUserSettings(
        responseData: GCSSWorkflow[] | null,
        criteria: ((workflow: GCSSWorkflow) => boolean) | Array<(workflow: GCSSWorkflow) => boolean>,
    ) {
        const criteriaArray = Array.isArray(criteria) ? criteria : [criteria];
        const filteredWorkflows = responseData?.filter((wf) => criteriaArray.every((func) => func(wf)));
        console.log("Filtered workflows according to settings", filteredWorkflows);
        return filteredWorkflows;
    }
    private static async getResponseData(viewType: ViewType) {
        await this.client.getWorkflows("REPLY_RECEIVED");
        const response = await this.client.getWorkflows("REPLY_RECEIVED");
        console.log("GCSS workflows fetched: ", response);
        if (response.totalResults < 1) {
            console.log("No data found.");
            return null;
        }
        return response.data;
    }
    private static async notifyMessageHub(messageType: COMMANDS, workflows: GCSSWorkflow[]) {
        return chrome.runtime.sendMessage(new MSG(messageType, workflows));
    }
    private static includesOneOf(target: string, options: string[]) {
        return options.some((option) => target.toLowerCase().includes(option.toLowerCase()));
    }
}
