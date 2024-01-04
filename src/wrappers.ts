import { get_config } from "./config.ts";
import { fail } from "./api/common.ts";
import { error } from "./utils.ts";

type Wrapper = (fn: CallableFunction) => CallableFunction;

function this_with(this_fn: CallableFunction) {
  return (wrapper: Wrapper) => {
    const new_fn = wrapper(this_fn);
    return {
      call: this_fn,
      with: this_with(new_fn),
    };
  };
}

function identity(fn: CallableFunction) {
  return fn;
}

export function wrap(fn: CallableFunction) {
  return this_with(fn)(identity);
}

export function verify_token(handler: CallableFunction) {
  return (args: Record<string, string>) =>
    (args["token"] !== get_config().api_token)
      ? fail(401, "invalid token")
      : handler(args);
}

export function add_cors(handler: CallableFunction) {
  return (args: unknown) => {
    const response = handler(args);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  };
}

export function require_args(desired_args: string[]): Wrapper {
  return (handler: CallableFunction) => (args: Record<string, string>) => {
    for (const arg of desired_args) {
      if (!(arg in args)) {
        return new Response(`Missing argument: ${arg}`, { status: 400 });
      }
    }
    return handler(args);
  };
}

export function json_header(handler: CallableFunction) {
  return (args: unknown) => {
    const response = handler(args);
    response.headers.set("Content-Type", "application/json");
    return response;
  };
}
