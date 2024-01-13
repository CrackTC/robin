import { verify_token, wrap } from "../../wrappers.ts";
import { ApiHandler } from "../api.ts";
import { ok } from "../common.ts";

export default () => wrap<ApiHandler>(() => ok()).with(verify_token);
