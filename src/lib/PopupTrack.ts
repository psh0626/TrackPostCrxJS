export default class PopupTrack {
  ItemId: string = "";
  IsTracked: boolean = false;
  SetItemId(id: string) {
    this.ItemId = id;
    this.IsTracked = true;
    this.SetLocal();
  }
  Dispose() {
    this.ItemId = "";
    this.IsTracked = false;
    this.SetLocal();
  }
  private async SetLocal() {
    const str_this = JSON.stringify(this);
    await chrome.storage.local.set({ PopupTrack: str_this });
    console.log("session set 'PopupTrack':", str_this);
  }
  async LoadLocal() {
    const data = await chrome.storage.local.get("PopupTrack");
    if (data) {
      const new_pt = JSON.parse(data.PopupTrack) as PopupTrack;
      Object.assign(this, new_pt);
    }
  }
  OnChange(callback: () => void) {
    chrome.storage.local.onChanged.addListener((change) => {
      if (change.PopupTrack) {
        const newTrack = JSON.parse(change.PopupTrack.newValue) as PopupTrack;
        Object.assign(this, newTrack);
        console.log("session PopupTrack change detected: ", this, "new track:", newTrack);
        callback();
      }
    });
    console.log("PopupTrack has been subscribed");
  }
}
