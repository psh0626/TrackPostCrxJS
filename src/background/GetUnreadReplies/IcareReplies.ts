import axios, { AxiosResponse, AxiosRequestConfig } from "axios";
import { IcareResponse, WorkflowItem } from "./DataWrapper";

export class IcareAPI {
  static LastCsrfToken: string = "";
  private static FirstTrialHeader = {
        headers: {
          Accept: "application/json, text/javascript; q=0.01",
            "Accept-language": "ko,en;q=0.9,en-US;q=0.8,es;q=0.7",
              "Content-Type": "application/json; charset=UTF-8",
      },
        withCredentials: true,
    };
  private static SecondTrialHeader = {
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-language": "ko,en;q=0.9,en-US;q=0.8,es;q=0.7",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      withCredentials: true,
    };
  static async FetchUnreadReplies(csrfToken: string) {
    const bodyCombined = this.GetBodyStringForUnreadItems(csrfToken);
    axios
      .post("https://icare.post/?module=workflow&tab=active&action=overviewJson&mode=ajax", bodyCombined, this.FirstTrialHeader)
      .then((response: AxiosResponse<IcareResponse>) => {
        console.log("axios.post request success (first attempt)");
        const a = response.data.control;
        this.LastCsrfToken = response.data.control.csrfToken;
        console.log(response.data);
        this.OnSuccess(response);
      })
      .catch((error) => {
        console.error("axios.post request failed:", error);
        const response: IcareResponse = error.response.data;
        this.LastCsrfToken = "";
        this.OneMoreAttempt(response.control.csrfToken);
      });
  }

  private static async OneMoreAttempt(csrfToken: string) {
    console.log("one more attempt begins");
    const bodyCombined = this.GetBodyStringForUnreadItems(csrfToken);
    axios
      .post("https://icare.post/?module=workflow&tab=active&action=overviewJson&mode=ajax", bodyCombined, this.SecondTrialHeader)
      .then((response: AxiosResponse<IcareResponse>) => {
        console.log("axios.post request success (second attempt)");
        console.log(response.data);
        this.LastCsrfToken = response.data.control.csrfToken;
        this.OnSuccess(response);
      })
      .catch((error) => {
        console.error("axios.post request finally failed:", error);
        const response: IcareResponse = error.response.data;
        this.LastCsrfToken = response.control.csrfToken;
      });
  }

  private static OnSuccess(response: AxiosResponse<IcareResponse>) {
    const workflow_items = response.data.content.data.map((rawdata) => new WorkflowItem(rawdata));
    console.log(`${workflow_items.length} items fetched:`,workflow_items);
  }

  private static GetBodyStringForUnreadItems(csrfToken: string): string {
    const bodyData =
      "draw=5&columns[0][data]=0&columns[0][name]=&columns[0][searchable]=true&columns[0][orderable]=false&columns[0][search][value]=&columns[0][search][regex]=false&columns[1][data]=1&columns[1][name]=&columns[1][searchable]=true&columns[1][orderable]=false&columns[1][search][value]=&columns[1][search][regex]=false&columns[2][data]=2&columns[2][name]=&columns[2][searchable]=true&columns[2][orderable]=true&columns[2][search][value]=&columns[2][search][regex]=false&columns[3][data]=3&columns[3][name]=&columns[3][searchable]=true&columns[3][orderable]=true&columns[3][search][value]=&columns[3][search][regex]=false&columns[4][data]=4&columns[4][name]=&columns[4][searchable]=true&columns[4][orderable]=true&columns[4][search][value]=&columns[4][search][regex]=false&columns[5][data]=5&columns[5][name]=&columns[5][searchable]=true&columns[5][orderable]=true&columns[5][search][value]=&columns[5][search][regex]=false&columns[6][data]=6&columns[6][name]=&columns[6][searchable]=true&columns[6][orderable]=true&columns[6][search][value]=&columns[6][search][regex]=false&columns[7][data]=7&columns[7][name]=&columns[7][searchable]=true&columns[7][orderable]=true&columns[7][search][value]=&columns[7][search][regex]=false&columns[8][data]=8&columns[8][name]=&columns[8][searchable]=true&columns[8][orderable]=false&columns[8][search][value]=&columns[8][search][regex]=false&columns[9][data]=9&columns[9][name]=&columns[9][searchable]=true&columns[9][orderable]=true&columns[9][search][value]=-1&columns[9][search][regex]=false&columns[10][data]=10&columns[10][name]=&columns[10][searchable]=true&columns[10][orderable]=true&columns[10][search][value]=2&columns[10][search][regex]=false&columns[11][data]=11&columns[11][name]=&columns[11][searchable]=true&columns[11][orderable]=true&columns[11][search][value]=&columns[11][search][regex]=false&columns[12][data]=12&columns[12][name]=&columns[12][searchable]=true&columns[12][orderable]=true&columns[12][search][value]=&columns[12][search][regex]=false&columns[13][data]=13&columns[13][name]=&columns[13][searchable]=true&columns[13][orderable]=true&columns[13][search][value]=&columns[13][search][regex]=false&columns[14][data]=14&columns[14][name]=&columns[14][searchable]=true&columns[14][orderable]=true&columns[14][search][value]=&columns[14][search][regex]=false&columns[15][data]=15&columns[15][name]=&columns[15][searchable]=true&columns[15][orderable]=true&columns[15][search][value]=&columns[15][search][regex]=false&columns[15][search][min]=&columns[15][search][max]=&columns[16][data]=16&columns[16][name]=&columns[16][searchable]=true&columns[16][orderable]=false&columns[16][search][value]=&columns[16][search][regex]=false&order[0][column]=15&order[0][dir]=desc&start=0&length=50&search[value]=&search[regex]=false";
    const bodyConfig = "&origin=requesting&dueDate=-1&postalOperator=-1&read=unread&responsibleUser=5320";
    const bodyCsrfToken = "&csrfToken=" + encodeURIComponent(csrfToken);
    return encodeURI(bodyData) + bodyConfig + bodyCsrfToken;
  }
}
