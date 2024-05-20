import { COMMANDS, Msg } from "../../lib/Message";
import { IMICSettings } from "../../lib/OptionElement";
import { GcssItem, GcssRawItem, TrimObject } from "./DataWrapper";

export class GcssAPI {
  static user_name = "sunghoon";
  static settings = new IMICSettings();
  static settings_loaded = false;

  static ScheduleAnotherFetch() {
    setTimeout(() => {
      this.FetchReplies();
    }, 15000);
  }
  static async FetchReplies() {
    if (!this.settings_loaded){
      await this.settings.RequestLoad();      
      this.settings_loaded = true;
    }

    const response = await fetch("https://gcss.ipc.be/CSS/gcss/list-tasks", {
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json;charset=UTF-8",
      },
      referrer: "https://gcss.ipc.be/CSS/gcss/product-view/EMS",
      body: '{"folder":"RPLYRCVD","products":["EMS"],"refresh":true}',
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      console.error(response.status);
      if (this.settings.GcssUnreadReplies)
        chrome.runtime.sendMessage(new Msg(COMMANDS.GCSS_UNREAD_REPLIES, "?"));
      this.ScheduleAnotherFetch();
      return;
    }
    const fetched_obj = TrimObject(await response.json()) as GcssRawItem[];
    console.log("GCSS REPLIES FETCHED: ", fetched_obj);

    const my_msgs = fetched_obj.filter((item) =>
      item.requestAuthor.toLowerCase().includes(this.user_name.toLowerCase())
    );
    console.log("My Messages: ", my_msgs);

    const unread_msgs = fetched_obj
      .filter(
        (item) =>
          (item.readStatus === "UNREAD" || item.readStatus === "MARKED_UNREAD") &&
          item.requestAuthor.toLowerCase().includes(this.user_name.toLowerCase())
      )
      .map((item) => GcssItem.FromRawItem(item));
    console.log("GCSS REPLIES FILTERED: ", unread_msgs);

    const test_sums = fetched_obj
      .filter(
        (item) =>
          item.numberOfSum > 0 &&
          item.requestAuthor.toLowerCase().includes(this.user_name.toLowerCase())
      )
      .map((item) => GcssItem.FromRawItem(item));
    console.log("GCSS SUM > 0: ", test_sums);

    const combined = [...unread_msgs, ...test_sums];
    const uniqueCombined = Array.from(new Set(combined.map((item) => item.ItemId))).map((id) =>
      combined.find((item) => item.ItemId === id)
    );

    chrome.runtime.sendMessage(new Msg(COMMANDS.GCSS_UNREAD_REPLIES, unread_msgs));

    this.ScheduleAnotherFetch();
  }
}
