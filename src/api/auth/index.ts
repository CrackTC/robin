import { ok } from "../common.ts";
import { verify_token, wrap } from "../../wrappers.ts";

export default () => wrap(() => ok()).with(verify_token);
