import { GcssItem, GcssRawItem, TrimObject } from "./DataWrapper";

export class GcssAPI {
  static user_name = "sunghoon";
  static async FetchReplies() {
    const response = await fetch("https://gcss.ipc.be/CSS/gcss/list-tasks", {
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "application/json;charset=UTF-8",
      },
      referrer: "https://gcss.ipc.be/CSS/gcss/product-view/EMS",
      body: '{"folder":"RPLYRCVD","products":["EMS"],"refresh":false}',
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      console.error(response.status);
      return;
    }
    const fetched_obj = TrimObject(await response.json()) as GcssRawItem[];
    console.log("GCSS REPLIES FETCHED: ", fetched_obj);

    const unread_msgs = fetched_obj
      .filter(
        (item) =>
          item.readStatus === "UNREAD" &&
          item.requestAuthor.toLowerCase().includes(this.user_name.toLowerCase())
      )
      .map((item) => GcssItem.FromRawItem(item));
    console.log("GCSS REPLIES FILTERED: ", unread_msgs);
    // item link: https://gcss.ipc.be/CSS/gcss/EMS/reply/show/message/${messageId}/item/${itemPk}/task/${taskId}
  }
}
