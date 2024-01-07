import {
  add_group_to_handler,
  get_groups,
  remove_group_from_handler,
} from "../../handlers/base.ts";
import { is_decimal_number } from "../../utils.ts";
import { fail, ok } from "../common.ts";
import { require_args, verify_token, wrap } from "../../wrappers.ts";
import { ApiHandler } from "../api.ts";

const all = () => ok(get_groups());

const add = (args: Record<string, string>) => {
  const group = args["group"];
  if (!is_decimal_number(group)) {
    return fail(400, `invalid group, expected integer, got ${group}`);
  }

  return add_group_to_handler(args["name"], Number(args["group"]))
    ? ok()
    : fail();
};

const remove = (args: Record<string, string>) => {
  const group = args["group"];
  if (!is_decimal_number(args["group"])) {
    return fail(400, `invalid group, expected integer, got ${group}`);
  }

  return remove_group_from_handler(args["name"], Number(args["group"]))
    ? ok()
    : fail();
};

export default function mux(path: string[]) {
  switch (path.shift()) {
    case "all":
      return wrap<ApiHandler>(all)
        .with(verify_token);
    case "add":
      return wrap(add)
        .with(require_args(["name", "group"]))
        .with(verify_token);
    case "remove":
      return wrap(remove)
        .with(require_args(["name", "group"]))
        .with(verify_token);
    default:
      return () => fail();
  }
}
