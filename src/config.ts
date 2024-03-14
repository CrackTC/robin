import { debounce } from "https://deno.land/std@0.210.0/async/debounce.ts";
import { EventEmitter } from "https://deno.land/x/eventemitter@1.2.4/mod.ts";
import { assert, error, log } from "/utils.ts";

const FALLBACK_TOKEN = crypto.randomUUID();

export class Config {
  self_id: number;
  port: number;
  http_addr: string;
  ws_addr: string;
  api_token: string;
  groups: number[];
  max_retry: number;
  retry_interval: number;
  timeout: number;
  handlers: { [key: string]: object };

  constructor() {
    this.self_id = 0;
    this.port = 3101;
    this.http_addr = "";
    this.ws_addr = "";
    this.api_token = FALLBACK_TOKEN;
    this.groups = [];
    this.max_retry = 5;
    this.retry_interval = 30;
    this.timeout = 10;
    this.handlers = {};
  }
}

export const config_events = new EventEmitter<{
  change(config: Config): void;
}>();

export const read_config = (): Config => {
  const json = JSON.parse(Deno.readTextFileSync("data/config.json"));
  return { ...new Config(), ...json };
};

export const verify_config = (config: Config) => {
  assert(typeof config.self_id === "number", "self_id must be a number");
  assert(config.self_id > 0, "self_id must be positive");

  assert(typeof config.port === "number", "port must be a number");
  assert(
    config.port > 0 && config.port < 65536,
    "port must be in range 1-65535",
  );

  assert(typeof config.http_addr === "string", "http_addr must be a string");
  assert(typeof config.ws_addr === "string", "ws_addr must be a string");

  assert(
    config.ws_addr.length > 0 || config.http_addr.length > 0,
    "at least one of http_addr and ws_addr must be non-empty",
  );

  assert(typeof config.api_token === "string", "api_token must be a string");

  assert(Array.isArray(config.groups), "groups must be an array");

  assert(typeof config.max_retry === "number", "max_retry must be a number");
  assert(config.max_retry >= 0, "max_retry must be non-negative");

  assert(
    typeof config.retry_interval === "number",
    "retry_interval must be a number",
  );
  assert(config.retry_interval >= 0, "retry_interval must be non-negative");

  assert(typeof config.timeout === "number", "timeout must be a number");
  assert(config.timeout >= 0, "timeout must be non-negative");

  assert(typeof config.handlers === "object", "handlers must be an object");
};

export const load_config = () => {
  const config = read_config();
  verify_config(config);
  log("api_token:", config.api_token);
  return config;
};

let CONFIG: Config;

export const watch_config = async () => {
  const configWatcher = Deno.watchFs("data/");
  const reloadConfig = debounce(() => {
    try {
      CONFIG = load_config();
      config_events.emit("change", CONFIG);
      log("config reloaded");
    } catch (e) {
      error(e);
    }
  }, 50);

  for await (const event of configWatcher) {
    try {
      if (
        event.kind === "modify" &&
        Deno.realPathSync(event.paths[0]) ===
          Deno.realPathSync("data/config.json")
      ) reloadConfig();
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) error(e);
    }
  }
};

export const get_config = () => {
  if (!CONFIG) {
    CONFIG = load_config();
    config_events.emit("change", CONFIG);
  }
  return CONFIG;
};
