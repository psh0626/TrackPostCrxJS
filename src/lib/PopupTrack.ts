import { COMMANDS, MSG } from "./message";

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
        void this.PassToBackground();
    }
    private async PassToBackground() {
        await chrome.runtime.sendMessage(new MSG(COMMANDS.POPUP_TRACK_SET, this));
    }
}
