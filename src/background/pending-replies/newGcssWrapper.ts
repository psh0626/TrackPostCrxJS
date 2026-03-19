export interface IGCSSNotification {
    id: string;
    href: string;
    workflowId: string;
    itemId: string;
    product: string;
    type: string;
    typeLabel: string;
    reason: string;
    reasonLabel: string;
    sendingCallCenterUpuCode: string;
    sendingPartner: string;
    sendingCountry: string;
    receivingCallCenterUpuCode: string;
    receivingPartner: string;
    receivingCountry: string;
    author: string;
    authorName: string;
    replyDate: string | null;
    creationDate: string;
    lastUpdateDate: string;
    readBy: string | null;
    readByName: string | null;
    readStatus: string;
    ignored: boolean;
    attachmentCount: number;
    status: string;
    statusLabel: string;
    reply: null;
}

export interface IGCSSWorkflow {
    id: string;
    status: string;
    itemId: string;
    returnItem: boolean;
    product: string;
    inquiryType: string;
    requestTypeLabel: string;
    requestTypeMnemonic: string;
    requestType: string;
    inquirer: string;
    sendingCallCenterUpuCode: string;
    sendingPartner: string;
    sendingCountry: string;
    receivingCallCenterUpuCode: string;
    receivingPartner: string;
    receivingCountry: string;
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
    attachmentCount: number;
    readStatus: string;
    href: string;
}

export interface GcssResponse {
    data: IGCSSWorkflow[] | IGCSSNotification[];
    currentPage: number;
    totalResults: number;
}

class GCSSMessage {
    id!: string;
    href!: string;
    itemId!: string;
    product!: string;
    sendingCallCenterUpuCode!: string;
    sendingPartner!: string;
    sendingCountry!: string;
    receivingCallCenterUpuCode!: string;
    receivingPartner!: string;
    receivingCountry!: string;
    attachmentCount!: number;
    readStatus!: string;

    constructor(data: Partial<GCSSMessage>) {
        Object.assign(this, data);
    }
}
export class GCSSWorkflow extends GCSSMessage implements IGCSSWorkflow {
    status!: string;
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
    constructor(data: IGCSSWorkflow) {
        super(data);
        Object.assign(this, data);
    }
}
export class GCSSNotification extends GCSSMessage implements IGCSSNotification {
    constructor(data: IGCSSNotification) {
        super(data);
        Object.assign(this, data);
    }
    workflowId!: string;
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
    status!: string;
    statusLabel!: string;
    reply!: null;

    /**
     * Returns true if the notification is unread.
     */
    isUnread(): boolean {
        return this.readStatus !== "READ";
    }

    /**
     * Returns true if the notification has attachments.
     */
    hasAttachments(): boolean {
        return this.attachmentCount > 0;
    }

    /**
     * Returns a formatted string for the notification.
     */
    toString(): string {
        return `[${this.typeLabel}] ${this.reasonLabel} (${this.statusLabel})`;
    }
}
export class GcssArray<T extends IGCSSWorkflow | IGCSSNotification> extends Array<T> {
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
    filterServiceTypes(serviceTypes: string[]): GcssArray<T> {
        const filtered = this.filter((item) => this.includesOneOf(item.product, serviceTypes));
        console.log("Filtered by service types", filtered);
        return filtered;
    }
    filterAuthor(authorNames: string[]): GcssArray<T> {
        const filtered = this.filter(
            (item) => "inquiryAuthorName" in item && this.includesOneOf((item as any).inquiryAuthorName, authorNames),
        );
        console.log("Filtered by authors", filtered);
        return filtered;
    }
    filterUnread() {
        const filtered = this.filter((item) => item.readStatus !== "READ");
        console.log("Filtered by unread status", filtered);
        return filtered;
    }
    filterInbound() {
        const filtered = this.filter((item) => "itemId" in item && (item as any).itemId.slice(-2) !== "KR");
        console.log("Filtered by inbound notifications", filtered);
        return filtered;
    }
    filterOutbound() {
        const filtered = this.filter((item) => "itemId" in item && (item as any).itemId.slice(-2) === "KR");
        console.log("Filtered by outbound notifications", filtered);
        return filtered;
    }
    filterOutboundByCountries(countries: string[]) {
        const filtered = this.filter(
            (item) => "sendingCountry" in item && this.includesOneOf((item as any).sendingCountry, countries),
        );
        console.log("Filtered by outbound notification countries", filtered);
        return filtered;
    }

    filterOutboundExcludeCountries(countries: string[]) {
        const filtered = this.filter(
            (item) => "sendingCountry" in item && !this.includesOneOf((item as any).sendingCountry, countries),
        );
        console.log("Filtered by outbound notification excluded countries", filtered);
        return filtered;
    }

    includesOneOf(target: string, options: string[]) {
        return options.some((option) => target.toLowerCase().includes(option.toLowerCase()));
    }
}
