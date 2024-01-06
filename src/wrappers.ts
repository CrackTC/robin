import { get_config } from "./config.ts";
import { fail } from "./api/common.ts";
import { error } from "./utils.ts";

type Wrapper = (fn: CallableFunction) => CallableFunction;

const this_with = (this_fn: CallableFunction) => (wrapper: Wrapper) => {
  const new_fn = wrapper(this_fn);
  return { call: new_fn, with: this_with(new_fn) };
};

const identity = (fn: CallableFunction) => fn;
export const wrap = (fn: CallableFunction) => this_with(fn)(identity);

export const verify_token =
  (handler: CallableFunction) => (args: Record<string, string>) =>
    args["token"] !== get_config().api_token
      ? fail(401, "invalid token")
      : handler(args);

export const add_cors = (handler: CallableFunction) => (args: unknown) => {
  const response = handler(args);
  response.headers.set("Access-Control-Allow-Origin", "*");
  return response;
};

export const require_args =
  (desired: string[]) =>
  (handler: CallableFunction) =>
  (args: Record<string, string>) =>
    desired.every((arg) => arg in args) ? handler(args) : fail(
      400,
      `Missing: ${desired.filter((arg) => !(arg in args)).join(", ")}`,
    );

export const json_header = (handler: CallableFunction) => (args: unknown) => {
  const response = handler(args);
  response.headers.set("Content-Type", "application/json; charset=utf-8");
  return response;
};

export const task_queue = (handler: CallableFunction) => {
  let task = Promise.resolve();
  return (args: unknown) => task = task.then(() => handler(args)).catch(error);
};
