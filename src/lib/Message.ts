export const COMMANDS = {
  NULL: "NULL",
  FETCH_POST_ELEMENT: "FETCH_POST_ELEMENT",
  WEB_REQUEST_COMPLETE: "WEB_REQUEST_COMPLETE",
  UNREAD_REPLIES: "UNREAD_REPLIES",
} as const;

export type CommandKey = keyof typeof COMMANDS;

export class Msg {
  public Command: CommandKey;
  public Param: any = null;

  constructor(command: CommandKey, param?: any) {
    this.Command = command;
    this.Param = param;
  }
}
