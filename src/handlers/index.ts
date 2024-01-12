import { log } from "../utils.ts";
import { Event } from "../onebot/types/event/common.ts";
import {
  is_group_message_event,
  is_heartbeat_event,
} from "../onebot/cqhttp.ts";
import { handle_group_event } from "./message/group/index.ts";
import { handle_heartbeat_event } from "./meta_event/heartbeat/index.ts";
import { load_handlers as load_group_handlers } from "./message/group/index.ts";
import { load_handlers as load_heartbeat_handlers } from "./meta_event/heartbeat/index.ts";
import { EventHandler } from "./types.ts";

export const event_handlers: Record<string, EventHandler> = {};

export const disable_handler = (handler_name: string) => {
  if (handler_name in event_handlers) {
    event_handlers[handler_name].enabled = false;
    return true;
  }
  return false;
};

export const enable_handler = (handler_name: string) => {
  if (handler_name in event_handlers) {
    event_handlers[handler_name].enabled = true;
    return true;
  }
  return false;
};

export const get_handlers = () =>
  Object.values(event_handlers).map((handler) => ({
    name: handler.name,
    enabled: handler.enabled,
  }));

export const handle_event = (event: Event) => {
  if (is_group_message_event(event)) {
    log(`group message event: ${JSON.stringify(event)}`);
    handle_group_event(event);
  } else if (is_heartbeat_event(event)) {
    log(`heartbeat event: ${JSON.stringify(event)}`);
    handle_heartbeat_event(event);
  }
};

export const on_config_change = () =>
  Object.values(event_handlers)
    .forEach((handler) => handler.on_config_change?.());

export const load_handlers = async () => {
  await Promise.all([
    load_group_handlers(),
    load_heartbeat_handlers(),
  ]);
};
