import { HeartbeatEvent } from "../../../onebot/types/event/meta.ts";
import { log } from "../../../utils.ts";
import { event_handlers } from "../../index.ts";
import { EventHandler } from "../../types.ts";
import { HeartbeatEventHandler } from "./types.ts";

const is_heartbeat_event_handler = (
  handler: EventHandler,
): handler is HeartbeatEventHandler => handler.type == "heartbeat";

const get_heartbeat_event_handlers = () =>
  Object.values(event_handlers).filter(is_heartbeat_event_handler);

export const handle_heartbeat_event = (event: HeartbeatEvent) => {
  get_heartbeat_event_handlers()
    .filter((handler) => handler.enabled)
    .forEach(async (handler) => {
      try {
        log(`handling event with heartbeat handler ${handler.name}`);
        await handler.handle_func(event);
      } catch (e) {
        log(`error in heartbeat handler ${handler.name}: ${e}`);
      }
    });
};

export const load_handlers = async () => {
  for (const dirEntry of Deno.readDirSync("./handlers/meta_event/heartbeat")) {
    if (dirEntry.isDirectory) {
      const item: HeartbeatEventHandler =
        (await import(`./${dirEntry.name}/index.ts`)).default;
      event_handlers[item.name] = item;
      item.on_config_change?.();
      log(`loaded heartbeat handler ${item.name}`);
    }
  }
};
