import { error, heartbeat_start, log } from "../utils.ts";
import { get_config } from "../config.ts";
import { GroupMessageEvent } from "../onebot/types/event/message.ts";
import { Event } from "../onebot/types/event/common.ts";
import {
  is_group_message_event,
  is_heartbeat_event,
} from "../onebot/cqhttp.ts";
import { setup_ws_api, setup_ws_event, WS_EVENT } from "../ws.ts";

export type GroupEventHandleFunc = (
  event: GroupMessageEvent,
) => Promise<void> | void;

export type GroupEventHandler = {
  name: string;
  handle_func: GroupEventHandleFunc;
  on_config_change: { (): void };
};

type GroupEventHandlerInternal = GroupEventHandler & {
  groups: number[];
  enabled: boolean;
};

const group_event_handlers: { [name: string]: GroupEventHandlerInternal } = {};

export const handle_event = (event: Event) => {
  if (is_group_message_event(event)) {
    log(`group message event: ${JSON.stringify(event)}`);
    if (get_config().groups.includes(event.group_id)) {
      handle_group_msg_event(event);
    }
  } else if (is_heartbeat_event(event)) {
    log(`heartbeat event: ${JSON.stringify(event)}`);
    const beat = heartbeat_start(event.interval, () => {
      setup_ws_event();
      setup_ws_api();
    });
    const listener = (msg: MessageEvent) => {
      const event: Event = JSON.parse(msg.data);
      if (is_heartbeat_event(event)) {
        beat();
        WS_EVENT.removeEventListener("message", listener);
      }
    };
    WS_EVENT.addEventListener("message", listener);
  }
};

const handle_group_msg_event = (event: GroupMessageEvent) =>
  Object.values(group_event_handlers)
    .filter((handler) =>
      handler.enabled && handler.groups.includes(event.group_id)
    )
    .forEach(async (handler) => {
      try {
        log(`Handling event with handler ${handler.name}`);
        await handler.handle_func(event);
      } catch (e) {
        error(`Error in handler ${handler.name}: ${e}`);
      }
    });

export const disable_handler = (handler_name: string) => {
  if (handler_name in group_event_handlers) {
    group_event_handlers[handler_name].enabled = false;
    return true;
  }
  return false;
};

export const enable_handler = (handler_name: string) => {
  if (handler_name in group_event_handlers) {
    group_event_handlers[handler_name].enabled = true;
    return true;
  }
  return false;
};

export function get_handlers() {
  return Object.values(group_event_handlers).map((item) => ({
    name: item.name,
    enabled: item.enabled,
  }));
}

export function add_group_to_handler(
  handler_name: string,
  group_id: number,
) {
  if (handler_name in group_event_handlers) {
    const groups = group_event_handlers[handler_name].groups;
    if (!groups.includes(group_id)) {
      groups.push(group_id);
      return true;
    }
  }
  return false;
}

function add_group_to_handlers(group_id: number) {
  Object.values(group_event_handlers).forEach((handler) => {
    const groups = handler.groups;
    if (!groups.includes(group_id)) groups.push(group_id);
  });
}

export function remove_group_from_handler(
  handler_name: string,
  group_id: number,
) {
  if (handler_name in group_event_handlers) {
    const groups = group_event_handlers[handler_name].groups;
    const group_index = groups.indexOf(group_id);
    if (group_index !== -1) {
      groups.splice(group_index, 1);
      return true;
    }
  }
  return false;
}

export function get_handler_groups(handler_name: string) {
  if (handler_name in group_event_handlers) {
    return group_event_handlers[handler_name].groups;
  }
  return null;
}

export const get_groups = () => get_config().groups;

export function on_config_change() {
  Object.values(group_event_handlers).forEach((handler) => {
    handler.on_config_change();
  });
}

export const get_handler_info = (name: string) => group_event_handlers[name];

export async function load_handlers() {
  for (const dirEntry of Deno.readDirSync("./handlers")) {
    if (dirEntry.isDirectory) {
      const handler: GroupEventHandler =
        (await import(`./${dirEntry.name}/index.ts`)).default;
      group_event_handlers[handler.name] = {
        ...handler,
        groups: [],
        enabled: true,
      };
      handler.on_config_change();
      log(`Loaded handler ${handler.name}`);
    }
  }
  get_config().groups.forEach(add_group_to_handlers);
}
