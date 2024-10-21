import { COMMANDS, Msg } from "./Message";

export default class PopupTrack {
  ItemId: string = "";
  IsTracked: boolean = false;
  
  async SetItemId(id: string) {
    this.ItemId = id;
    this.IsTracked = true;
    await this.PassToBackground();
  }
  Reset() {
    this.ItemId = "";
    this.IsTracked = false;
    this.PassToBackground();
  }
  private async PassToBackground() {
    await chrome.runtime.sendMessage(new Msg(COMMANDS.POPUP_TRACK_SET, this));
  }
}
