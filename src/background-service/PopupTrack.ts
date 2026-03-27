export default class PopupTrack {
    ItemId: string = "";
    IsTracked: boolean = false;

    async SetItemId(id: string) {
        this.ItemId = id;
        this.IsTracked = true;
        await this.saveSession();
    }
    Reset() {
        this.ItemId = "";
        this.IsTracked = false;
        this.saveSession();
    }
    private saveSession() {
        return chrome.storage.session.set({ PopupTrack: this });
    }
}
