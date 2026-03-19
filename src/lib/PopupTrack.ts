import { COMMANDS, MSG } from "./Message";

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
    private PassToBackground() {
        return chrome.runtime.sendMessage(new MSG(COMMANDS.POPUP_TRACK_SET, this));
    }
}
