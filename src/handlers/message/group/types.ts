import { Config } from "../../../config.ts";
import { GroupMessageEvent } from "../../../onebot/types/event/message.ts";
import { EventHandler } from "../../types.ts";

export type GroupEventHandleFunc = (
  event: GroupMessageEvent,
) => void | Promise<void>;

export class GroupEventHandler extends EventHandler {
  groups: number[] = [];
  handle_func: GroupEventHandleFunc;
  constructor(
    { name, handle_func, on_config_change }: {
      name: string;
      handle_func: GroupEventHandleFunc;
      on_config_change?: (config: Config) => void;
    },
  ) {
    super(name, "group", on_config_change);
    this.handle_func = handle_func;
  }
}
