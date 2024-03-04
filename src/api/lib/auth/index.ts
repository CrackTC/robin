import { verify_token, wrap } from "/wrappers.ts";
import { ApiHandler } from "/api/types.ts";
import { ok } from "/api/common.ts";

export default () => wrap<ApiHandler>(() => ok()).with(verify_token);
