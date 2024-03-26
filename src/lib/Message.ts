import COMMANDS from "./Enums";
export default class Msg {
  public Command: string | undefined = undefined;
  public ItemId: string | undefined = undefined;

  constructor(command?: string | undefined, itemId?: string | undefined) {
    this.Command = command;
    this.ItemId = itemId;
  }
}
