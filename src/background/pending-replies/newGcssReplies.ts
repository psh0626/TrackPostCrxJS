import { IMICSettings } from "../../lib/IMICSettings";
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
        if (this.settings.GcssUnreadReplies) {
            const response = await this.client.getWorkflows("REPLY_RECEIVED");
            console.log("GCSS workflows fetched: ", response);
            if (response.totalResults < 1) {
                console.log("No data found.");
                return;
            }

            console.log("Filtering workflows with settings", this.settings.GcssAuthor, this.settings.GcssServiceTypes);

            const filteredWorkflows = response.data.filter(
                (workflow) =>
                    this.includesOneOf(workflow.inquiryAuthorName, this.settings.GcssAuthor) &&
                    this.includesOneOf(workflow.product, this.settings.GcssServiceTypes),
            );
            console.log("Filtered workflows according to settings", filteredWorkflows);

            const unreadWorkflows = filteredWorkflows.filter((workflow) => workflow.readStatus === "UNREAD");
            console.log("Filtered unread workflows", unreadWorkflows);

            await this.notifyMessageHub(filteredWorkflows);
        }
    }
    static async notifyMessageHub(workflows: GCSSWorkflow[]) {}
    static includesOneOf(target: string, options: string[]) {
        return options.some((option) => target.toLowerCase().includes(option.toLowerCase()));
    }
}
