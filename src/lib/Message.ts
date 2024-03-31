export enum COMMANDS {
  NULL = "NULL",
  FETCH_POST_ELEMENT = "FETCH_POST_ELEMENT",
  WEB_REQUEST_COMPLETE = "WEB_REQUEST_COMPLETE",
  UNREAD_REPLIES = "UNREAD_REPLIES",
}

export class Msg {
  public Command: COMMANDS;
  public Param: any = null;

  constructor(command: COMMANDS, param?: any) {
    this.Command = command;
    this.Param = param;
  }
}
