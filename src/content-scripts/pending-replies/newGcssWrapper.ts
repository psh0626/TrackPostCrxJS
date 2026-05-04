export const GCSS_API_BASE_URL = "https://gcss.ipc.be/ui-gtw/api";
export const GCSS_WEB_BASE_URL = "https://gcss.ipc.be";

// Type guard for GCSSMessage
export function isGCSSMessage(obj: any): obj is GCSSMessage {
    return (
        obj &&
        typeof obj === "object" &&
        typeof obj.id === "string" &&
        typeof obj.href === "string" &&
        typeof obj.product === "string"
    );
}
export function isGCSSNotification(obj: any): obj is GCSSNotification {
    return obj && typeof obj === "object" && typeof obj.ignored === "boolean";
}
export interface IGCSSBase {
    id: string;
    href: string;
    itemId: string;
    product: string;
    status: string;
    sendingCallCenterUpuCode: string;
    sendingPartner: string;
    sendingCountry: string;
    receivingCallCenterUpuCode: string;
    receivingPartner: string;
    receivingCountry: string;
    attachmentCount: number;
    readStatus: string;
    workflowId: string;
}

export interface IGCSSNotification extends IGCSSBase {
    workflowId: string;
    type: string;
    typeLabel: string;
    reason: string;
    reasonLabel: string;
    author: string;
    authorName: string;
    replyDate: string | null;
    creationDate: string;
    lastUpdateDate: string;
    readBy: string | null;
    readByName: string | null;
    ignored: boolean;
    statusLabel: string;
    reply: null;
}

export interface IGCSSWorkflow extends IGCSSBase {
    returnItem: boolean;
    inquiryType: string;
    requestTypeLabel: string;
    requestTypeMnemonic: string;
    requestType: string;
    inquirer: string;
    inquiryAuthor: string;
    inquiryAuthorName: string;
    latestInquiryHandler: string | null;
    latestInquiryHandlerName: string | null;
    inquiryReplyAuthor: string;
    inquiryReplyAuthorName: string;
    nextDueDate: string;
    latestMessageDate: string;
    inquiryCreationDate: string;
    inquiryReplyCreationDate: string;
    sumCount: number;
    qumCount: number;
    qumrCount: number;
    reactivationCount: number;
}

export interface GcssResponse {
    data: IGCSSWorkflow[] | IGCSSNotification[];
    currentPage: number;
    totalResults: number;
}

export type GCSSMessage = GCSSWorkflow | GCSSNotification;
export class GCSSMessageBase implements IGCSSBase {
    id!: string;
    href!: string;
    itemId!: string;
    product!: string;
    status!: string;
    workflowId!: string;
    sendingCallCenterUpuCode!: string;
    sendingPartner!: string;
    sendingCountry!: string;
    receivingCallCenterUpuCode!: string;
    receivingPartner!: string;
    receivingCountry!: string;
    attachmentCount!: number;
    readStatus!: string;
    constructor(data: Partial<GCSSMessageBase>) {
        Object.assign(this, data);
    }
}
export class GCSSWorkflow extends GCSSMessageBase implements IGCSSWorkflow {
    returnItem!: boolean;
    inquiryType!: string;
    requestTypeLabel!: string;
    requestTypeMnemonic!: string;
    requestType!: string;
    inquirer!: string;
    inquiryAuthor!: string;
    inquiryAuthorName!: string;
    latestInquiryHandler!: string | null;
    latestInquiryHandlerName!: string | null;
    inquiryReplyAuthor!: string;
    inquiryReplyAuthorName!: string;
    nextDueDate!: string;
    latestMessageDate!: string;
    inquiryCreationDate!: string;
    inquiryReplyCreationDate!: string;
    sumCount!: number;
    qumCount!: number;
    qumrCount!: number;
    reactivationCount!: number;
    messageLink: string = `${GCSS_WEB_BASE_URL}/#/items/${this.itemId}/workflow/${this.id}`;
    isNotification = false;
    constructor(data: IGCSSWorkflow) {
        super(data);
        Object.assign(this, data);
    }
}
export class GCSSNotification extends GCSSMessageBase implements IGCSSNotification {
    constructor(data: IGCSSNotification) {
        super(data);
        Object.assign(this, data);
    }
    type!: string;
    typeLabel!: string;
    reason!: string;
    reasonLabel!: string;
    author!: string;
    authorName!: string;
    replyDate!: string | null;
    creationDate!: string;
    lastUpdateDate!: string;
    readBy!: string | null;
    readByName!: string | null;
    ignored!: boolean;
    statusLabel!: string;
    reply!: null;
    messageLink: string = `${GCSS_WEB_BASE_URL}/#/items/${this.itemId}/workflow/${this.workflowId}/inquiry/${this.id}`;
    isNotification = true;
    isUnread(): boolean {
        return this.readStatus !== "READ";
    }

    hasAttachments(): boolean {
        return this.attachmentCount > 0;
    }
    toString(): string {
        return `[${this.typeLabel}] ${this.reasonLabel} (${this.statusLabel})`;
    }
}
export class GcssArray<T extends IGCSSBase> extends Array<T> {
    constructor(items: T[] = []) {
        if (Array.isArray(items)) {
            super(...items);
        } else {
            super();
        }
        Object.setPrototypeOf(this, GcssArray.prototype); // Ensures correct prototype chain
    }

    filter(predicate: (value: T, index: number, array: T[]) => boolean): GcssArray<T> {
        const filtered = Array.prototype.filter.call(this, predicate);
        return new GcssArray(filtered);
    }
    static includesOneOf(target: string, options: string[]) {
        return options.some((option) => target.toLowerCase().includes(option.toLowerCase()));
    }
    filterServiceTypes(serviceTypes: string[]): GcssArray<IGCSSWorkflow> {
        const filtered = this.filter((item) => GcssArray.includesOneOf(item.product, serviceTypes));
        console.log("[GcssWorkflowService] Filtered by service types", filtered);
        return new GcssArray(filtered) as unknown as GcssArray<IGCSSWorkflow>;
    }
    filterAuthor(authorNames: string[]): GcssArray<IGCSSWorkflow> {
        if (authorNames.length === 0) return new GcssArray(this as unknown as IGCSSWorkflow[]);
        const filtered = this.filter((item) =>
            GcssArray.includesOneOf((item as unknown as IGCSSWorkflow).inquiryAuthorName, authorNames),
        );
        console.log("[GcssWorkflowService] Filtered by authors", filtered);
        return new GcssArray(filtered) as unknown as GcssArray<IGCSSWorkflow>;
    }
    filterUnread(): GcssArray<T> {
        const filtered = this.filter((item) => item.readStatus !== "READ");
        console.log("[GcssWorkflowService] Filtered by unread status", filtered);
        return new GcssArray(filtered);
    }
    filterInbound(): GcssArray<T> {
        const filtered = this.filter((item) => item.itemId.slice(-2) !== "KR");
        console.log("[GcssWorkflowService] Filtered by inbound notifications", filtered);
        return new GcssArray(filtered);
    }
    filterOutbound(): GcssArray<T> {
        const filtered = this.filter((item) => item.itemId.slice(-2) === "KR");
        console.log("[GcssWorkflowService] Filtered by outbound notifications", filtered);
        return new GcssArray(filtered);
    }
    filterEMS(): GcssArray<T> {
        const filtered = this.filter((item) => item.product.toUpperCase() === "EMS");
        console.log("[GcssWorkflowService] Filtered by EMS service", filtered);
        return new GcssArray(filtered);
    }
    filterOutboundByCountries(countries: string[]): GcssArray<T> {
        if (countries.length === 0) return new GcssArray(this);
        const filtered = this.filter((item) => GcssArray.includesOneOf(item.sendingCountry, countries));
        console.log("[GcssWorkflowService] Filtered by outbound notification countries", filtered);
        return new GcssArray(filtered);
    }

    filterOutboundExcludeCountries(countries: string[]): GcssArray<T> {
        if (countries.length === 0) return new GcssArray(this);
        const filtered = this.filter((item) => !GcssArray.includesOneOf(item.sendingCountry, countries));
        console.log("[GcssWorkflowService] Filtered by outbound notification excluded countries", filtered);
        return new GcssArray(filtered);
    }
    mapToGcssWorkflow(): GcssArray<GCSSWorkflow> {
        const mapped = Array.prototype.map.call(
            this,
            (item: IGCSSWorkflow) => new GCSSWorkflow(item),
        ) as GCSSWorkflow[];
        console.log("[GcssWorkflowService] Mapped to GCSSWorkflow", mapped);
        return new GcssArray(mapped);
    }
    mapToGcssNotification(): GcssArray<GCSSNotification> {
        const mapped = Array.prototype.map.call(
            this,
            (item: IGCSSNotification) => new GCSSNotification(item),
        ) as GCSSNotification[];
        console.log("[GcssWorkflowService] Mapped to GCSSNotification", mapped);
        return new GcssArray(mapped);
    }
}
export interface GcssPrefillObject {
    dateOfPosting?: string | null;
    deliveryDate?: string | null;
    contents?: string | null;
    itemValue?: string | null;
    itemValueCurrency?: string | null;
    itemWeight?: string | null;
    postagePaid?: string | null;
    postagePaidCurrency?: string | null;
    destinationPostcode?: string | null;

    senderName?: string | null;
    senderEmail?: string | null;
    senderTelephone?: string | null;
    senderProvince?: string | null;
    senderStreet?: string | null;
    senderCity?: string | null;
    senderPostcode?: string | null;

    addresseeName?: string | null;
    addresseeEmail?: string | null;
    addresseeTelephone?: string | null;
    addresseeProvince?: string | null;
    addresseeStreet?: string | null;
    addresseeCity?: string | null;
    addresseePostcode?: string | null;
}

export type GcssPrefillDataGroup = "ITEM_DETAILS" | "SENDER_DETAILS" | "ADDRESSEE_DETAILS";

export interface GcssPrefillData {
    dataGroup: GcssPrefillDataGroup;
    name: string;
    value: string | null;
}

export interface GcssPrefillInquiryResponse {
    prefillInquiryId: string | null;
    itemOriginCountry: string;
    itemDestinationCountry: string;
    receivingCallCenter: string | null;
    receivingPartner: string;
    inquirer: string | null;
    requestType: string | null;
    manualDespatchInfo: string | null;
    dataElements: GcssPrefillData[];
}
