import { ok } from "../common.ts";
import { verify_token, wrap } from "../../wrappers.ts";
import { ApiHandler } from "../api.ts";

export default () => wrap<ApiHandler>(() => ok()).with(verify_token);
