import { COMMANDS, Msg } from "../../lib/Message";
import { IMICSettings } from "../../lib/OptionElement";
import { GcssItem, GcssRawItem, TrimObject } from "./DataWrapper";

export class GcssAPI {
  static user_name = "";
  static settings = new IMICSettings();
  static settings_loaded = false;

  static ScheduleAnotherFetch() {
    setTimeout(() => {
      this.FetchReplies();
    }, 15000);
  }
  private static async PostFetch(
    folder: "RPLYRCVD" | "TODO" = "RPLYRCVD",
    serviceType: "EMS" = "EMS"
  ) {
    return await fetch("https://gcss.ipc.be/CSS/gcss/list-tasks", {
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json;charset=UTF-8",
      },
      referrer: "https://gcss.ipc.be/CSS/gcss/product-view/EMS",
      body: `{"folder":"${folder}","products":["${serviceType}"],"refresh":true}`,
      method: "POST",
      credentials: "include",
    });
  }
  private static async FetchRequests() {
    const response = await this.PostFetch("TODO", "EMS");
    if (!response.ok) {
      console.error(response.status);
      return;
    }
    const trimmed = TrimObject(await response.json()) as GcssRawItem[];
    console.log("GCSS REQUESTS FETCHED: ", trimmed);

    const unread = trimmed
      .filter((item) => item.readStatus === "UNREAD" || item.readStatus === "MARKED_UNREAD")
      .map((item) => GcssItem.FromRawItem(item));
    console.log("GCSS REQUESTS FILTERED: ", unread);

    chrome.runtime.sendMessage(new Msg(COMMANDS.GCSS_UNREAD_REQUESTS, unread));
  }
  static async FetchReplies() {
    if (!this.settings_loaded) {
      await this.settings.RequestLoad();
      this.user_name = this.settings.GcssAuthor;
      this.settings_loaded = true;
    }

    const response = await this.PostFetch("RPLYRCVD", "EMS");
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

    chrome.runtime.sendMessage(new Msg(COMMANDS.GCSS_UNREAD_REPLIES, unread_msgs));

    this.FetchRequests();

    this.ScheduleAnotherFetch();
  }
}
