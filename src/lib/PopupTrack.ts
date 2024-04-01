import { COMMANDS, Msg } from "./Message";

export default class PopupTrack {
  ItemId: string = "";
  IsTracked: boolean = false;
  
  SetItemId(id: string) {
    this.ItemId = id;
    this.IsTracked = true;
    this.PassToBackground();
  }
  Reset() {
    this.ItemId = "";
    this.IsTracked = false;
    this.PassToBackground();
  }
  private PassToBackground() {
    chrome.runtime.sendMessage(new Msg(COMMANDS.POPUP_TRACK_SET, this));
  }
}
