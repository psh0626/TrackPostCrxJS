import COMMANDS from "./Enums";
export default class Msg {
  public Command: string | undefined = undefined;
  public ItemId: string | undefined = undefined;

  constructor(command?: string | undefined, param?: string | undefined) {
    this.Command = command;
    this.ItemId = param;
  }
}
