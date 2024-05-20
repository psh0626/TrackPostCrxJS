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
    await chrome.storage.sync.set({ IMICSettings: this });
    console.log("Options Saved as ", this);
  }
  async LoadOptions() {
    const newThis = await chrome.storage.sync.get("IMICSettings");
    // for (const key in newThis) {
    //   console.log(key);
    //   if (key !== "PersonalRemarks") {
    //     const newKey = new PersonalRemark(newThis.key.Title, newThis.key.Content, newThis.key.Id, "REQ");
    //     newThis.PersonalRemarks.push(newKey);
    //   }
    // }
    //console.log("newthis: ", newThis);
    Object.assign(this, newThis.IMICSettings);
    console.log("this: ", this);
  }

  async RequestSave() {
    await SendRequest(new Msg(COMMANDS.SAVE_OPTIONS, this));
  }

  async RequestLoad() {
    Object.assign(this, await SendRequest<IMICSettings>(new Msg(COMMANDS.LOAD_OPTIONS)));
  }
}
