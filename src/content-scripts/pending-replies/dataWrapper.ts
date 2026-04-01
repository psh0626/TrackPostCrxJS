
// Type guard for GcssItem
export function isGcssItem(obj: any): obj is GcssItem {
    return (
        obj &&
        typeof obj === "object" &&
        typeof obj.requestingCallcenter === "string" &&
        typeof obj.workflowLink === "string" &&
        typeof obj.internalItemId === "number"
    );
}

// Type guard for WorkflowItem
export function isWorkflowItem(obj: any): obj is WorkflowItem {
    return (
        obj &&
        typeof obj === "object" &&
        typeof obj.internalId === "string" &&
        typeof obj.trackingId === "string" &&
        typeof obj.link === "string" &&
        typeof obj.readStatus === "string"
    );
}


export function trimObject(obj: any): any {
    if (typeof obj !== "object" || obj === null) {
        // If it's not an object or it's null, return it as is
        return obj;
    }

    // Iterate over all properties of the object
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];

            if (typeof value === "string") {
                // Trim the string value
                obj[key] = value.trim();
            } else if (typeof value === "object") {
                // Recursively trim nested objects
                trimObject(value);
            }
        }
    }

    return obj;
}
export class GcssItem {
    requestingCallcenter = "";
    originCountry = "";
    destinationCountry = "";
    itemId = "";
    workflowLevel = "";
    serviceType = "";
    serviceName = "";
    readStatus = "";
    requestAuthor = "";
    requestType = "";
    replyAuthor = "";
    internalItemId = -1;
    internalMessageId = -1;
    internalTaskId = -1;
    workflowLink = "";
    messageType = "";
    numberOfSum = -1;
    notificationReason = "";
    notificationStatus = "REPLY_COMPLETED";
    notificationCreationDate = "";
    notificationId = -1;
    notificationLink = "";

    constructor(data?: Partial<GcssItem>) {
        if (data) Object.assign(this, data);
        this.GenerateLink();
    }

    public static FromRawItem(rawItem: GcssRawItem): GcssItem {
        if (rawItem.messageType.substring(0, 1) === "N") {
            return new GcssItem({
                originCountry: rawItem.originCountry!,
                destinationCountry: rawItem.destCountry,
                requestingCallcenter: rawItem.origCallCentre,
                itemId: rawItem.itemId,
                readStatus: rawItem.readStatus,
                requestAuthor: rawItem.originAuthor!,
                notificationReason: this.ConvertReason(rawItem.notificationReasonLabel!),
                notificationCreationDate: this.ConvertDate(rawItem.notificationStatusCreationDate!),
                notificationId: rawItem.notificationStatusId!,
                notificationStatus: rawItem.notificationStatus!,
                notificationLink: `https://gcss.ipc.be/CSS/gcss/EMS/notification/showRequest/${rawItem.notificationStatusId!}`,
                messageType: rawItem.messageType,
            });
        } else
            return new GcssItem({
                originCountry: rawItem.origCountry,
                destinationCountry: rawItem.destCountry,
                requestingCallcenter: rawItem.origCallCentre,
                itemId: rawItem.itemId,
                workflowLevel: rawItem.taskDescription,
                serviceType: rawItem.product,
                serviceName: rawItem.productName,
                readStatus: rawItem.readStatus,
                requestAuthor: rawItem.requestAuthor,
                requestType: rawItem.requestTypeMnemonic,
                replyAuthor: rawItem.replyAuthor,
                internalItemId: rawItem.itemPk,
                internalMessageId: rawItem.messageId,
                internalTaskId: rawItem.taskId,
                numberOfSum: rawItem.numberOfSum,
                messageType: rawItem.messageType,
            });
    }
    private GenerateLink() {
        const is_reply = (this.requestingCallcenter || this.originCountry).includes("KR") ? "reply" : "request";
        this.workflowLink =
            `https://gcss.ipc.be/CSS/gcss/${this.serviceType}` +
            `/${is_reply}/show/message/${this.internalMessageId}` +
            `/item/${this.internalItemId}` +
            `/task/${this.internalTaskId}`;
    }
    private static ConvertReason(reason: string) {
        switch (reason) {
            case "Item found undeliverable":
                return "Undeliverable";
            case "Item retained by Customs - documentation required":
                return "Retained";
            case "Item found damaged":
                return "Damaged";
            case "Item found delayed":
                return "Delayed";
            case "Operational irregularity":
                return "Irregularity";
            default:
                return reason;
        }
    }
    private static ConvertDate(dateSerial: number) {
        const date = new Date(dateSerial);
        const result =
            (date.getMonth() + 1).toString().padStart(2, "0") + "/" + date.getDate().toString().padStart(2, "0");
        return result;
    }
}
export interface GcssRawItem {
    itemId: string;
    productName: string;
    taskDescription: string;
    requestTypeMnemonic: string;
    inquirer: string;
    returnsIndicator: boolean;
    origCountry: string;
    origCallCentre: string;
    destCountry: string;
    destCallCentre: string;
    replyAuthor: string;
    requestAuthor: string;
    creationDate: number;
    displayCreationDate: number;
    numberOfSum: number;
    numberOfQum: number;
    numberOfQumr: number;
    numberOfReact: number;
    rating: boolean;
    latestMessageDate: number;
    displayLatestMessageDate: number;
    numberOfAttachments: number;
    level: number;
    itemPk: number;
    messageId: number;
    readStatus: string;
    taskId: number;
    notificationType: string | null;
    product: string;
    productId: number;
    messageType: string;
    productAcronym: string;
    subject: string | null;
    reason: string | null;
    stagingId: string | null;
    dueDate: string | null;
    broadcastId: string | null;
    originPartner: string | null;
    originCallCentre: string | null;
    originCountry: string | null;
    notificationStatusId: number | null;
    notificationStatusCreationDate: number | null;
    notificationStatus: string | null;
    originCallcentre: string | null;
    destinationCallcentre: string | null;
    sticky: boolean;
    stickyFrom: string | null;
    stickyTo: string | null;
    originAuthor: string | null;
    destinationAuthor: string | null;
    destinationCountry: string | null;
    details: string | null;
    newEvent: string | null;
    displayDueDate: string | null;
    authorId: string | null;
    notificationReasonLabel: string | null;
    replyIgnoreDate: string | null;
    displayReplyIgnoreDate: string | null;
    type: string | null;
    handler: string | null;
    exportTitle: string;
}

export class WorkflowItem {
    internalId: string = "";
    trackingId: string = "";
    link: string = "";
    dispatchNo: string = "";
    lastTrace: string = "";
    dueDate: string = "";
    currentLevel: number = 0;
    duration: number = 0;
    requestType: string = "";
    workflowStatus: string = "";
    requestingOperator: string = "";
    replyingOperator: string = "";
    author: string = "";
    lastUpdated: string = "";
    created: string = "";
    readStatus: string = "";
    isNotification: boolean = false;

    constructor(data?: RawData | Partial<WorkflowItem>) {
        if (!data) {
            return;
        }

        if (this.isRawData(data)) {
            this.isNotification = data[3].includes("module=notification");
            if (this.isNotification) {
                this.internalId = this.extractNameAttribute(data[0]);
                this.trackingId = this.extractInnerText(data[3]);
                this.link = this.extractHrefAndPrefix(data[3]);
                this.lastTrace = data[4];
                this.requestType = this.convertNotificationType(data[5]);
                this.workflowStatus = data[6];
                this.requestingOperator = data[7];
                this.replyingOperator = data[8];
                this.author = data[9];
                this.dispatchNo = data[10];
                this.lastUpdated = this.extractInnerText(data[11]);
                this.created = this.extractInnerText(data[12]);
                this.readStatus = data.DT_RowClass;
                return;
            }
            this.internalId = this.extractNameAttribute(data[0]);
            this.trackingId = this.extractInnerText(data[3]);
            this.link = this.extractHrefAndPrefix(data[3]);
            this.dispatchNo = data[4];
            this.lastTrace = data[5];
            this.dueDate = this.extractInnerText(data[6]);
            this.currentLevel = parseInt(data[7]);
            this.duration = parseInt(data[8]);
            this.requestType = this.convertRequestType(data[9]);
            this.workflowStatus = data[10];
            this.requestingOperator = data[11];
            this.replyingOperator = data[12];
            this.author = data[13];
            this.lastUpdated = this.extractInnerText(data[14]);
            this.created = this.extractInnerText(data[15]);
            this.readStatus = data.DT_RowClass;
        } else {
            Object.assign(this, data);
        }
    }
    private isRawData(data: any): data is RawData {
        // Simple check to determine if data is RawData - adjust according to your data structure
        return typeof data[0] === "string" || typeof data[1] === "string";
    }

    private convertNotificationType(type: string) {
        switch (type) {
            case "Item damaged":
                return "Damaged";
            case "Item delayed":
                return "Delayed";
            case "Item retained":
                return "Retained";
            case "Operational irregularity":
                return "Irregularity";
            case "Item undeliverable":
                return "Undeliverable";
            default:
                return type;
        }
    }
    private convertRequestType(reqTypeString: string) {
        switch (reqTypeString) {
            case "Update/confirmation item status":
                return "Status";
            case "Written proof of delivery":
                return "WPOD";
            case "Disputed delivery":
                return "Disputed";
            case "Request for change":
                return "CN17";
            case "Damaged/missing contents":
                return "Damaged/missing";
            case "Missent/redirected/transit":
                return "Missent";
            case "Unexplained return of the item":
                return "Unex. Return";
            case "Customs investigation":
                return "Customs";
            case "COD amount not received":
                return "COD";
            default:
                return reqTypeString;
        }
    }

    private extractNameAttribute(htmlString: string): string {
        const matches = htmlString.match(/name="([^"]+)"/);
        return matches ? matches[1] : "";
    }

    // Extracts href value from an anchor element and prefixes with the domain
    private extractHrefAndPrefix(htmlString: string): string {
        const matches = htmlString.match(/href="([^"]+)"/);
        return matches ? `https://icare.post/${decodeURI(matches[1]).replaceAll("amp;", "")}` : "";
    }

    // Extracts inner text from HTML string
    private extractInnerText(htmlString: string): string {
        // Remove HTML tags
        const textOnly = htmlString.replace(/<[^>]*>/g, "");

        // Decode HTML entities
        const textWithDecodedEntities = textOnly
            .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">");

        return textWithDecodedEntities.trim();
    }
}
interface RawData {
    [key: number]: string;
    DT_RowClass: string;
}
interface Content {
    data: RawData[];
    draw: number;
    recordsFiltered: number;
}

interface Control {
    csrfToken: string;
}

// Assuming `errors` is an array of a specific type, define an interface for the items if they have a structure
// If the structure of errors is known and uniform, define it here, e.g.,
interface ErrorItem {
    code: string;
    message: string;
}

export interface IcareResponse {
    content: Content;
    control: Control;
    errors: ErrorItem[]; // Use the ErrorItem interface if the errors have a specific structure

    // Add other methods as needed to interact with the data, e.g., getters or methods to process data
}
