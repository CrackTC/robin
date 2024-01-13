import { get_config } from "../../../config.ts";
import { GroupMessageEvent } from "../../../onebot/types/event/message.ts";
import { error, log } from "../../../utils.ts";
import { load_handlers_from_url } from "../../common.ts";
import { event_handlers } from "../../index.ts";
import { EventHandler } from "../../types.ts";
import { GroupEventHandler } from "./types.ts";

const is_group_event_handler = (
  handler: EventHandler,
): handler is GroupEventHandler => handler.type == "group";

const get_group_event_handlers = () =>
  Object.values(event_handlers).filter(is_group_event_handler);

export const handle_group_event = (event: GroupMessageEvent) => {
  get_group_event_handlers()
    .filter((handler) => handler.enabled)
    .filter((handler) => handler.groups?.includes(event.group_id))
    .forEach(async (handler) => {
      try {
        log(`handling group message event with handler ${handler.name}`);
        await handler.handle_func(event);
      } catch (e) {
        error(`error in group message handler ${handler.name}: ${e}`);
      }
    });
};

export const get_group_event_handler = (name: string) => {
  if (!(name in event_handlers)) return null;
  const handler = event_handlers[name];
  if (!is_group_event_handler(handler)) return null;
  return handler;
};

export const add_group_to_handler = (
  handler_name: string,
  group_id: number,
) => {
  const handler = get_group_event_handler(handler_name);
  if (handler === null) return false;
  if (handler.groups?.includes(group_id)) return false;

  handler.groups?.push(group_id);
  return true;
};

const add_group_to_handlers = (group_id: number) =>
  get_group_event_handlers().forEach((handler) => {
    if (!handler.groups?.includes(group_id)) handler.groups?.push(group_id);
  });

export const remove_group_from_handler = (
  handler_name: string,
  group_id: number,
) => {
  const handler = get_group_event_handler(handler_name);
  if (handler === null) return false;

  const group_index = handler.groups?.indexOf(group_id) ?? -1;
  if (group_index === -1) return false;

  handler.groups?.splice(group_index, 1);
  return true;
};

export const get_handler_groups = (handler_name: string) => {
  const handler = get_group_event_handler(handler_name);
  if (handler === null) return null;
  return handler.groups;
};

export const load_group_handlers = async () => {
  await load_handlers_from_url("group", import.meta.url);
  get_config().groups.forEach(add_group_to_handlers);
};
