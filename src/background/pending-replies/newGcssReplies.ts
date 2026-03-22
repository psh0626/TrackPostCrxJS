import { IMICSettings } from "../../lib/IMICSettings";
import { CMD, MSG } from "../message-hub/Message";
import {
    GCSS_API_BASE_URL,
    GcssArray,
    GcssPrefillData,
    GcssPrefillInquiryResponse,
    GcssPrefillObject,
    IGCSSNotification,
    IGCSSWorkflow,
} from "./newGcssWrapper";

type WorkflowView = "TODOS" | "REQUEST_SENT" | "REPLY_SENT" | "REPLY_RECEIVED";
type NotificationView = "SENT" | "RECEIVED";
type WorkflowViewType = { readonly type: "workflows"; readonly view: WorkflowView };
type NotificationViewType = { readonly type: "notifications"; readonly view: NotificationView };
type ViewType = WorkflowViewType | NotificationViewType;

const workflow = (view: WorkflowView) => ({ type: "workflows", view }) as WorkflowViewType;
const notification = (view: NotificationView) => ({ type: "notifications", view }) as NotificationViewType;
class GcssClient {
    private readonly baseUrl = GCSS_API_BASE_URL;
    private readonly defaultParams = {
        products: "EMS,EXPRES,REG,INS,UPU,PREMIUM,STAND2,STAND30",
        sort_by: "CREATION_DATE",
        sort_direction: "DESC",
        page: "1",
        size: "500",
    };

    async getMessages(
        view: WorkflowViewType,
        params?: Partial<typeof this.defaultParams>,
    ): Promise<GcssArray<IGCSSWorkflow>>;
    async getMessages(
        view: NotificationViewType,
        params?: Partial<typeof this.defaultParams>,
    ): Promise<GcssArray<IGCSSNotification>>;
    async getMessages(viewType: ViewType, params: Partial<typeof this.defaultParams> = {}) {
        const endpoint = viewType.type;
        const url = new URL(this.baseUrl + "/" + endpoint + "?");

        url.searchParams.append("view", viewType.view);

        const finalParams = { ...this.defaultParams, ...params };
        Object.entries(finalParams).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });

        const response = await fetch(url.toString()).then((res) => res.json());
        console.log(`[GcssClient] GCSS ${endpoint.toUpperCase()} ${viewType.view} fetched: `, response);
        if (response.totalResults < 1) {
            console.log("No data found.");
            return new GcssArray();
        }
        return new GcssArray(response.data);
    }
    async getPrefillData(itemId: string): Promise<Array<GcssPrefillData> | null> {
        const url = this.baseUrl + "/prefill-inquiries/item-events/" + itemId;

        const responseData = await fetch(url).then((res) => {
            if (res.status !== 200) {
                return null;
            }
            return res.json() as Promise<GcssPrefillInquiryResponse>;
        });
        console.log(`[GcssClient] GCSS Prefill data fetched for item ${itemId}: `, responseData);
        return responseData?.dataElements || null;
    }
}
export class GcssWorkflowService {
    private static client = new GcssClient();
    static settings = new IMICSettings();
    static async fetchWorkflows() {
        const messages = [];
        if (this.settings.GcssUnreadRequests) {
            const workflows = await this.client.getMessages(workflow("TODOS"));

            console.log(
                "[GcssWorkflowService] Filtering TODOS workflows with settings",
                this.settings.GcssRequestServiceTypes,
            );

            const filteredWorkflows = workflows
                .filterServiceTypes(this.settings.GcssRequestServiceTypes)
                .filterUnread()
                .mapToGcssWorkflow();

            messages.push(new MSG(CMD.NEW_GCSS_UNREAD_REQUESTS, filteredWorkflows).notifyHub());
        }

        if (this.settings.GcssUnreadReplies) {
            const workflows = await this.client.getMessages(workflow("REPLY_RECEIVED"));
            console.log(
                "[GcssWorkflowService] Filtering REPLY_RECEIVED workflows with settings",
                this.settings.GcssAuthor,
                this.settings.GcssServiceTypes,
            );

            const filteredWorkflows = workflows
                .filterAuthor(this.settings.GcssAuthor)
                .filterServiceTypes(this.settings.GcssServiceTypes)
                .filterUnread()
                .mapToGcssWorkflow();

            messages.push(new MSG(CMD.NEW_GCSS_UNREAD_REPLIES, filteredWorkflows).notifyHub());
        }

        if (this.settings.GcssUnreadNotificationInbound || this.settings.GcssUnreadNotificationOutbound) {
            const notifications = await this.client.getMessages(notification("RECEIVED"));

            if (this.settings.GcssUnreadNotificationInbound) {
                const inbound = notifications.filterInbound().mapToGcssNotification();
                messages.push(new MSG(CMD.NEW_GCSS_UNREAD_NOTIF_INBOUND, inbound).notifyHub());
            }
            if (this.settings.GcssUnreadNotificationOutbound) {
                const outbound = notifications
                    .filterOutbound()
                    .filterOutboundByCountries(this.settings.GcssOutboundNotificationCountries)
                    .filterOutboundExcludeCountries(this.settings.GcssOutboundNotificationExcludedCountries)
                    .mapToGcssNotification();
                messages.push(new MSG(CMD.NEW_GCSS_UNREAD_NOTIF_OUTBOUND, outbound).notifyHub());
            }
        }

        if (messages.length > 0) {
            await Promise.all(messages);
        }
    }
    static async fetchPrefillData(itemId: string): Promise<GcssPrefillObject | null> {
        const prefillObj = await this.client.getPrefillData(itemId).then((prefillData) => {
            if (!prefillData) {
                console.log(`[GcssWorkflowService] No prefill data found for item ${itemId}`);
                return null;
            }
            const obj: GcssPrefillObject = {};
            prefillData.forEach((data) => {
                if (data && data.name) obj[data.name as keyof GcssPrefillObject] = data.value;
            });
            return obj;
        });
        return prefillObj;
    }
}
