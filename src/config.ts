class Config {
  readonly self_id = Number(Deno.env.get("SELF_ID") ?? 0);
  readonly port = Number(Deno.env.get("PORT") ?? 3101);
  readonly api_addr = Deno.env.get("API_ADDR") ?? "";
  readonly groups = Deno.env.get("GROUPS")?.split(":").map(Number) ?? [];
  readonly max_retry = Number(Deno.env.get("MAX_RETRY") ?? 5);
  readonly retry_interval = Number(Deno.env.get("RETRY_INTERVAL") ?? 30);
  readonly cron = Deno.env.get("CRON") ?? "1 0 0 * * *";
}

export const CONFIG = new Config();

if (CONFIG.groups.length == 0) throw new Error("GROUPS is required");
if (CONFIG.api_addr == "") throw new Error("API_ADDR is required");
