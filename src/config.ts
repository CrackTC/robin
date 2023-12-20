class Config {
  readonly port: number;
  readonly api_addr: string;
  readonly groups: number[];
  readonly max_retry: number;
  readonly retry_interval: number;
  readonly cron: string;

  constructor(
    port: number,
    api_addr: string,
    groups: number[],
    max_retry: number,
    retry_interval: number,
    cron: string,
  ) {
    this.port = port;
    this.api_addr = api_addr;
    this.groups = groups;
    this.max_retry = max_retry;
    this.retry_interval = retry_interval;
    this.cron = cron;
  }
}

const port = Number(Deno.env.get("PORT") ?? 3101);

const api_addr = Deno.env.get("API_ADDR") ?? "";
if (api_addr == "") throw new Error("API_ADDR is required");

const groups = Deno.env.get("GROUPS")?.split(":").map(Number) ?? [];
if (groups.length == 0) throw new Error("GROUPS is required");

const max_retry = Number(Deno.env.get("MAX_RETRY") ?? 5);
const retry_interval = Number(Deno.env.get("RETRY_INTERVAL") ?? 30);
const cron = Deno.env.get("CRON") ?? "1 0 0 * * *";

export const CONFIG = new Config(
  port,
  api_addr,
  groups,
  max_retry,
  retry_interval,
  cron,
);
