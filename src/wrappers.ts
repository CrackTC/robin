import { get_config } from "./config.ts";
import { fail } from "./api/common.ts";
import { error } from "./utils.ts";
import { ApiHandler } from "./api/api.ts";

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

type Action<T> = (arg: T) => void | Promise<void>;
type RateLimitArgs<T> = {
  get_limit: () => number;
  get_period: () => number;
  get_id: (arg: T) => number;
  validate?: (arg: T) => boolean;
  exceed_action: (arg: T, wait_seconds: number) => void | Promise<void>;
};

export const rate_limit = <TInput>(
  {
    get_limit,
    get_period,
    get_id,
    validate = (_: TInput) => true,
    exceed_action,
  }: RateLimitArgs<TInput>,
): Wrapper<Action<TInput>> => {
  const history: Record<number, number[]> = {};
  return (handler) => (input) => {
    if (!validate(input)) return;

    const limit = get_limit();
    const period = get_period();

    const id = get_id(input);
    if (!(id in history)) history[id] = [];
    const times = history[id];
    const now = Date.now();
    while (times.length > 0 && times[0] + period < now) times.shift();
    if (times.length >= limit) {
      while (times.length > limit) times.shift();

      const wait_seconds = Math.ceil(
        (times[0] + period - now) / 1000,
      );
      exceed_action(input, wait_seconds);
      return Promise.resolve();
    }
    times.push(now);
    return handler(input);
  };
};
