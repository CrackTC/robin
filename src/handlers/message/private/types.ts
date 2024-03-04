import { Config } from "/config.ts";
import { PrivateMessageEvent } from "/onebot/types/event/message.ts";
import { EventHandler } from "/handlers/types.ts";

export type PrivateEventHandleFunc = (
  event: PrivateMessageEvent,
) => void | Promise<void>;

export class PrivateEventHandler extends EventHandler {
  handle_func: PrivateEventHandleFunc;
  constructor(
    { name, handle_func, on_config_change }: {
      name: string;
      handle_func: PrivateEventHandleFunc;
      on_config_change?: (config: Config) => void;
    },
  ) {
    super(name, "private", on_config_change);
    this.handle_func = handle_func;
  }
}
