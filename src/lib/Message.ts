export enum COMMANDS {
  NULL = "NULL",
  FETCH_POST_ELEMENT = "FETCH_POST_ELEMENT",
  WEB_REQUEST_COMPLETE = "WEB_REQUEST_COMPLETE",
  UNREAD_REPLIES = "UNREAD_REPLIES",
  POPUP_TRACK_SET = "POPUP_TRACK_SET",
  SIDEPANEL_TRACK_REQUEST = "SIDEPANEL_TRACK_REQUEST",
  SAVE_ICARE_USER_ID = "SAVE_ICARE_USER_ID",
  LOAD_ICARE_USER_ID = "LOAD_ICARE_USER_ID",
  LOAD_ICARE_PREMARKS = "LOAD_ICARE_PREMARKS",
  SAVE_OPTIONS = "SAVE_OPTIONS",
}

export class Msg {
  public Command: COMMANDS;
  public Param: any = null;

  constructor(command: COMMANDS, param?: any) {
    this.Command = command;
    this.Param = param;
  }
}
export async function SendRequest<T>(message: Msg, param?: any): Promise<T>;
export async function SendRequest(message: Msg, param?: any): Promise<any>;
export async function SendRequest<T>(message: Msg, param?: any): Promise<T | any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, param, (response) => {
      resolve(response);
    });
  });
}
