import { Config } from "/config.ts";
import { HeartbeatEvent } from "/onebot/types/event/meta.ts";
import { EventHandler } from "/handlers/types.ts";

export type HeartbeatEventHandleFunc = (
  event: HeartbeatEvent,
) => void | Promise<void>;

export class HeartbeatEventHandler extends EventHandler {
  handle_func: HeartbeatEventHandleFunc;
  constructor(
    { name, handle_func, on_config_change }: {
      name: string;
      handle_func: HeartbeatEventHandleFunc;
      on_config_change?: (config: Config) => void;
    },
  ) {
    super(name, "heartbeat", on_config_change);
    this.handle_func = handle_func;
  }
}
