import { HeartbeatEvent } from "/onebot/types/event/meta.ts";
import { log } from "/utils.ts";
import { load_handlers_from_url } from "/handlers/common.ts";
import { event_handlers } from "/handlers/index.ts";
import { EventHandler } from "/handlers/types.ts";
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
        // log(`handling event with heartbeat handler ${handler.name}`);
        await handler.handle_func(event);
      } catch (e) {
        log(`error in heartbeat handler ${handler.name}: ${e}`);
      }
    });
};

export const load_heartbeat_handlers = () =>
  load_handlers_from_url("heartbeat", import.meta.url);
