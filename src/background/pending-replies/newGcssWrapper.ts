export interface GCSSWorkflow {
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
    data: GCSSWorkflow[];
    currentPage: number;
    totalResults: number;
}
