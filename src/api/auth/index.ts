import { ok } from "../common.ts";
import { verify_token, wrap } from "../../wrappers.ts";

export default function mux(_: string[]) {
  return wrap(() => ok()).with(verify_token);
}
