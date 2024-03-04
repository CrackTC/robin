import {
  is_group_message_event,
  is_heartbeat_event,
  is_private_message_event,
} from "/onebot/index.ts";
import { Event } from "/onebot/types/event/common.ts";
import { log } from "/utils.ts";
import {
  handle_group_event,
  load_group_handlers,
} from "./message/group/index.ts";
import {
  handle_private_event,
  load_private_handlers,
} from "./message/private/index.ts";
import {
  handle_heartbeat_event,
  load_heartbeat_handlers,
} from "./meta_event/heartbeat/index.ts";
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
    log(
      `[group] [${event.group_id}] ${
        event.sender.card ?? event.sender.nickname
      }: ${JSON.stringify(event.message)}`,
    );
    handle_group_event(event);
  } else if (is_private_message_event(event)) {
    log(
      `[private] ${event.sender.nickname ?? event.user_id}: ${
        JSON.stringify(event.message)
      }`,
    );
    handle_private_event(event);
  } else if (is_heartbeat_event(event)) {
    // log(`heartbeat event: ${JSON.stringify(event)}`);
    handle_heartbeat_event(event);
  }
};

export const load_handlers = async () => {
  await Promise.all([
    load_group_handlers(),
    load_private_handlers(),
    load_heartbeat_handlers(),
  ]);
};
