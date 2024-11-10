import { parseStringPromise } from "xml2js";

export class PostElement {
    ItemID: string = "";
    Contents: string = "";
    Destination: string = "";
    DestinationACR: string = "";
    SenderName: string = "";
    SenderPhone: string = "";
    SenderAddress: string = "";
    AddresseeName: string = "";
    AddresseePhone: string = "";
    AddresseeZipcode: string = "";
    AddresseeAddress: string = "";
    MailTypeCode: string = "";
    ApplicationDate: string = "";
    DeliveryResult: boolean = false; // Y or N
    InquiryRequested: boolean = false; // Y or N
    HEvent: boolean = false; // Y or N
    IEvent: boolean = false; // Y or N
    ItemTracked: boolean = false;

    // Constructor to facilitate instantiating with an object
    constructor(data?: Partial<PostElement>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}

export class PostAPI {
    private static async XmlToPostElement(
        xml: string,
        trackingNumber: string
    ): Promise<PostElement> {
        try {
            const result = await parseStringPromise(xml, {
                explicitArray: false,
                ignoreAttrs: true,
                trim: true,
            });
            const data = result.xsync.LData; // Adjust based on your XML structure
            if (data.length === 0) {
                console.log("Blank XML returned;");
                return new PostElement({ ItemID: trackingNumber, ItemTracked: false });
            }

            return new PostElement({
                ItemID: data.MAIL_NO,
                Contents: data.MAILCONT,
                Destination: data.ARRIV_NATION_NM,
                DestinationACR: data.ARRIV_NATION_CD,
                SenderName: data.SENDER_NM,
                SenderPhone: data.SENDER_TELNO,
                SenderAddress: data.SENDER_ADDR,
                AddresseeName: data.RECEIVER_NM,
                AddresseePhone: data.RECEIVER_TELNO,
                AddresseeZipcode: data.RECEIVER_ZIPCD,
                AddresseeAddress: data.RECEIVER_ADDR,
                MailTypeCode: data.FRNMAIL_DIV_CD,
                ApplicationDate: data.RECEVYMD,
                DeliveryResult: data.RESULTYN === "Y",
                InquiryRequested: data.REQYN === "Y",
                HEvent: data.HEVENT === "Y",
                IEvent: data.IEVENT === "Y",
                ItemTracked: true,
            });
        } catch (error) {
            console.error("Error parsing XML to object:", error);
            return new PostElement();
        }
    }

    private static async FetchPostXML(trackingNumber: string): Promise<string> {
        const postURL = "https://ems.epost.go.kr/trace.RegisterEmsClaimAjax.postal";
        try {
            const response = await fetch(postURL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
                },
                body: `POST_CODE=${trackingNumber}`,
            });

            if (!response.ok) {
                console.error(response.statusText);
                // throw new Error(response.statusText);
            }

            return response.text();
        } catch (error) {
            console.error("Failed to fetch and parse PostEntity:", error);
            return "";
        }
    }

    static async FetchPostElement(trackingNumber: string): Promise<PostElement> {
        return await this.FetchPostXML(trackingNumber).then((xml) =>
            this.XmlToPostElement(xml, trackingNumber)
        );
    }
}
