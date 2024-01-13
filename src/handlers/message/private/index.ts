import { PrivateMessageEvent } from "../../../onebot/types/event/message.ts";
import { error, log } from "../../../utils.ts";
import { load_handlers_from_url } from "../../common.ts";
import { event_handlers } from "../../index.ts";
import { EventHandler } from "../../types.ts";
import { PrivateEventHandler } from "./types.ts";

const is_private_event_handler = (
  handler: EventHandler,
): handler is PrivateEventHandler => handler.type == "private";

const get_private_event_handlers = () =>
  Object.values(event_handlers).filter(is_private_event_handler);

export const handle_private_event = (event: PrivateMessageEvent) => {
  get_private_event_handlers()
    .filter((handler) => handler.enabled)
    .forEach(async (handler) => {
      try {
        log(`handling private message event with handler ${handler.name}`);
        await handler.handle_func(event);
      } catch (e) {
        error(`error in private message handler ${handler.name}: ${e}`);
      }
    });
};

export const get_private_event_handler = (name: string) => {
  if (!(name in event_handlers)) return null;
  const handler = event_handlers[name];
  if (!is_private_event_handler(handler)) return null;
  return handler;
};

export const load_private_handlers = () =>
  load_handlers_from_url("private", import.meta.url);
