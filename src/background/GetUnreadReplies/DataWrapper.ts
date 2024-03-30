
export class WorkflowItem {
  internal_id: string = "";
  link: string = "";
  dispatch_no: string = "";
  last_trace: string = "";
  due_date: string = "";
  current_level: number = 0;
  duration: number = 0;
  request_type: string = "";
  workflow_status: string = "";
  requesting_op: string = "";
  replying_op: string = "";
  author: string = "";
  last_updated: string = "";
  created: string = "";
  read_status: string = "";

  constructor(data?: RawData | Partial<WorkflowItem>) {
    if (!data) {
      return;
    }

    if (this.isRawData(data)) {
      this.internal_id = this.extractNameAttribute(data[0]);
      this.link = this.extractHrefAndPrefix(data[3]);
      this.dispatch_no = data[4];
      this.last_trace = data[5];
      this.due_date = this.extractInnerText(data[6]);
      this.current_level = parseInt(data[7]);
      this.duration = parseInt(data[8]);
      this.request_type = data[9];
      this.workflow_status = data[10];
      this.requesting_op = data[11];
      this.replying_op = data[12];
      this.author = data[13];
      this.last_updated = this.extractInnerText(data[14]);
      this.created = this.extractInnerText(data[15]);
      this.read_status = data.DT_RowClass;
    } else {
      Object.assign(this, data);
    }
  }
  private isRawData(data: any): data is RawData {
    // Simple check to determine if data is RawData - adjust according to your data structure
    return typeof data[0] === "string" || typeof data[1] === "string";
  }

  private extractNameAttribute(htmlString: string): string {
    const matches = htmlString.match(/name="([^"]+)"/);
    return matches ? matches[1] : "";
  }

  // Extracts href value from an anchor element and prefixes with the domain
  private extractHrefAndPrefix(htmlString: string): string {
    const matches = htmlString.match(/href="([^"]+)"/);
    return matches ? `https://icare.post/${matches[1]}` : "";
  }

  // Extracts inner text from HTML string
  private extractInnerText(htmlString: string): string {
    // Remove HTML tags
    const textOnly = htmlString.replace(/<[^>]*>/g, "");

    // Decode HTML entities
    const textWithDecodedEntities = textOnly
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
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
