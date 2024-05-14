import { COMMANDS, Msg, SendRequest } from "./Message";

export class PersonalRemark {
  Id: number;
  Title: string;
  Content: string;

  constructor(title: string, content: string, id: number) {
    this.Id = id;
    this.Title = title;
    this.Content = content;
  }
}
export class IMICSettings {
  PersonalRemarks: PersonalRemark[] = [];

  async SaveOptions() {
    await chrome.storage.sync.set({ IMICSettings: this });
    console.log("Options Saved as ", this);
  }
  async LoadOptions() {
    Object.assign(
      this,
      (await chrome.storage.sync.get(this.constructor.name))[this.constructor.name]
    );
  }

  async RequestSave() {
    await SendRequest(new Msg(COMMANDS.SAVE_OPTIONS, this));
  }

  async RequestLoad() {
    Object.assign(this, await SendRequest<IMICSettings>(new Msg(COMMANDS.LOAD_OPTIONS)));
  }
}
