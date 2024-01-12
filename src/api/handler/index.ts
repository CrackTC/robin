import { require_args, verify_token, wrap } from "../../wrappers.ts";
import { fail, ok } from "../common.ts";
import { get_handler_groups } from "../../handlers/message/group/index.ts";
import {
  disable_handler,
  enable_handler,
  get_handlers,
} from "../../handlers/index.ts";

const all = () => ok(get_handlers());
const enable = (args: Record<string, string>) =>
  enable_handler(args["name"]) ? ok() : fail();

const disable = (args: Record<string, string>) =>
  disable_handler(args["name"]) ? ok() : fail();

const groups = (args: Record<string, string>) => {
  const groups = get_handler_groups(args["name"]);
  return groups === null ? fail() : ok(groups);
};

export default (path: string[]) => {
  switch (path.shift()) {
    case "all":
      return wrap(all);
    case "enable":
      return wrap(enable)
        .with(require_args(["name"]))
        .with(verify_token);
    case "disable":
      return wrap(disable)
        .with(require_args(["name"]))
        .with(verify_token);
    case "groups":
      return wrap(groups)
        .with(require_args(["name"]))
        .with(verify_token);
    default:
      return wrap(() => fail());
  }
};
