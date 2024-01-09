import { get_config } from "./config.ts";
import { fail } from "./api/common.ts";
import { error } from "./utils.ts";
import { mk_reply, mk_text, send_group_message } from "./onebot/cqhttp.ts";
import { GroupEventHandleFunc } from "./handlers/base.ts";
import { ApiHandler } from "./api/api.ts";
import { GroupMessageEvent } from "./onebot/types/event/message.ts";

type Wrapper<Fn extends CallableFunction> = (fn: Fn) => Fn;

const wrap_with_fn =
  <Fn extends CallableFunction>(this_fn: Fn) => (wrapper: Wrapper<Fn>) => {
    const new_fn = wrapper(this_fn);
    return { call: new_fn, with: wrap_with_fn(new_fn) };
  };

const identity = <T>(x: T) => x;
export const wrap = <Fn extends CallableFunction>(fn: Fn) =>
  wrap_with_fn(fn)(identity);

export const verify_token: Wrapper<ApiHandler> = (handler) => (args) =>
  args["token"] !== get_config().api_token
    ? fail(401, "invalid token")
    : handler(args);

export const add_cors: Wrapper<ApiHandler> = (handler) => (args) => {
  const response = handler(args);
  response.headers.set("Access-Control-Allow-Origin", "*");
  return response;
};

export const require_args =
  (desired: string[]): Wrapper<ApiHandler> => (handler) => (args) =>
    desired.every((arg) => arg in args) ? handler(args) : fail(
      400,
      `Missing: ${desired.filter((arg) => !(arg in args)).join(", ")}`,
    );

export const json_header: Wrapper<ApiHandler> = (handler) => (args) => {
  const response = handler(args);
  response.headers.set("Content-Type", "application/json; charset=utf-8");
  return response;
};

export const task_queue = <T>(handler: (arg: T) => void | Promise<void>) => {
  let task = Promise.resolve();
  return (arg: T) => task = task.then(() => handler(arg)).catch(error);
};

export const rate_limit = (
  get_limit: () => number,
  get_period: () => number,
  validate = (event: GroupMessageEvent) => true,
): Wrapper<GroupEventHandleFunc> => {
  const history: Record<number, number[]> = {};
  return (handler) => (event) => {
    if (!validate(event)) return;

    const limit = get_limit();
    const period = get_period();

    const group_id = event.group_id;
    if (!(group_id in history)) history[group_id] = [];
    const times = history[group_id];
    const now = new Date();
    while (times.length > 0 && times[0] + period < now.getTime()) times.shift();
    if (times.length >= limit) {
      while (times.length > limit) times.shift();

      const wait_seconds = Math.ceil(
        (times[0] + period - now.getTime()) / 1000,
      );
      send_group_message(
        group_id,
        [
          mk_text(`Rate limit exceeded. Please wait ${wait_seconds} seconds.`),
          mk_reply(event),
        ],
      );
      return Promise.resolve();
    }
    times.push(now.getTime());
    return handler(event);
  };
};
