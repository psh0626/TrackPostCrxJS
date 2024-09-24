import { COMMANDS, Msg } from "../../lib/Message";
import { IMICSettings } from "../../lib/OptionElement";
import { GcssItem, GcssRawItem, TrimObject } from "./DataWrapper";

enum ServiceType {
  EMS = "EMS",
  Parcel = "UPU",
  Registered = "REG",
  KPacket = "EXPRES",
}
export class GcssAPI {
  static settings: IMICSettings;

  static ScheduleAnotherFetch() {
    setTimeout(() => {
      this.FetchReplies();
    }, 15000);
  }
  private static async PostFetch(
    folder: "RPLYRCVD" | "TODO" = "RPLYRCVD",
    serviceType: ServiceType[] | ServiceType = ServiceType.EMS
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
  private static async FetchParcelReplies() {
    const response = await this.PostFetch("RPLYRCVD", ServiceType.Parcel);
  }
  private static async FetchRequests() {
    const response = await this.PostFetch("TODO", ServiceType.EMS);
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
  private static IncludesOneOf(target: string, search_strings: string[]) {
    return search_strings.some((item) => target.toLowerCase().includes(item.toLowerCase()));
  }
  static async FetchReplies(repeat: boolean = true) {
    console.log("fetching GCSS replies with settings: ", this.settings);
    const response = await this.PostFetch("RPLYRCVD", [ServiceType.EMS]); // TODO: 선택하는대로 추가시키기..
    if (!response.ok) {
      console.error(response.status);
      if (this.settings.GcssUnreadReplies)
        chrome.runtime.sendMessage(new Msg(COMMANDS.GCSS_UNREAD_REPLIES, "?"));
      //this.ScheduleAnotherFetch();
      return;
    }
    const fetched_obj = TrimObject(await response.json()) as GcssRawItem[];
    console.log("GCSS REPLIES FETCHED: ", fetched_obj);

    const my_msgs = fetched_obj.filter((item) =>
      this.IncludesOneOf(item.requestAuthor, this.settings.GcssAuthor)
    );
    console.log("My Messages: ", my_msgs);

    const unread_msgs = my_msgs
      .filter((item) => item.readStatus === "UNREAD" || item.readStatus === "MARKED_UNREAD")
      .map((item) => GcssItem.FromRawItem(item));
    console.log("GCSS REPLIES FILTERED: ", unread_msgs);

    chrome.runtime.sendMessage(new Msg(COMMANDS.GCSS_UNREAD_REPLIES, unread_msgs));

    if (this.settings.GcssUnreadRequests) this.FetchRequests();

    if (repeat) this.ScheduleAnotherFetch();
  }
}
