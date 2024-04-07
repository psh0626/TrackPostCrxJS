import { COMMANDS, Msg, SendRequest } from "./Message";

interface PersonalRemark{
  Title: string,
  Body: string,
}
export default class IMICSettings{
  PersonalRemarks: PersonalRemark[] = [];

  SaveOptions() {
    chrome.storage.sync.set(this);
  }
  async LoadOptions() {
    this.PersonalRemarks = (await chrome.storage.sync.get(this.constructor.name))[this.constructor.name].PersonalRemarks;
  }

  async RequestSave() {
    await SendRequest(new Msg(COMMANDS.SAVE_OPTIONS, this));
  }

  async RequestLoad() {
    this.PersonalRemarks = (await SendRequest<IMICSettings>(new Msg(COMMANDS.LOAD_ICARE_PREMARKS))).PersonalRemarks;
  }
}