import { COMMANDS, Msg, SendRequest } from "./Message";

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
  IcareUnreadRequests: boolean = false;
  PersonalRemarks: PersonalRemark[] = [];
  GcssUnreadReplies = false;
  GcssUnreadRequests = false;
  GcssAuthor = "";

  async SaveOptions() {
    await chrome.storage.local.set({ IMICSettings: this });
    console.log("Options Saved as ", this);
  }
  async LoadOptions() {
    const newThis = await chrome.storage.local.get("IMICSettings");
    Object.assign(this, newThis.IMICSettings);
    console.log("Options loaded this: ", this);
  }

  async RequestSave() {
    await SendRequest(new Msg(COMMANDS.SAVE_OPTIONS, this));
  }

  async RequestLoad() {
    Object.assign(this, await SendRequest<IMICSettings>(new Msg(COMMANDS.LOAD_OPTIONS)));
  }
}
