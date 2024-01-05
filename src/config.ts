import { assert, error, log } from "./utils.ts";
import { debounce } from "https://deno.land/std@0.210.0/async/debounce.ts";
import { on_config_change } from "./handlers/base.ts";

const FALLBACK_TOKEN = crypto.randomUUID();

class Config {
  self_id: number;
  port: number;
  api_addr: string;
  api_token: string;
  groups: number[];
  max_retry: number;
  retry_interval: number;
  handlers: { [key: string]: unknown };

  constructor() {
    this.self_id = 0;
    this.port = 3101;
    this.api_addr = "";
    this.api_token = FALLBACK_TOKEN;
    this.groups = [];
    this.max_retry = 5;
    this.retry_interval = 30;
    this.handlers = {};
  }
}

function readConfig() {
  const json = JSON.parse(Deno.readTextFileSync("data/config.json"));
  return Object.assign({}, new Config(), json);
}

function verifyConfig(config: Config) {
  assert(typeof config.self_id === "number", "self_id must be a number");
  assert(config.self_id > 0, "self_id must be positive");

  assert(typeof config.port === "number", "port must be a number");
  assert(
    config.port > 0 && config.port < 65536,
    "port must be in range 1-65535",
  );

  assert(typeof config.api_addr === "string", "api_addr must be a string");
  assert(config.api_addr.length > 0, "api_addr must not be empty");

  assert(typeof config.api_token === "string", "api_token must be a string");

  assert(Array.isArray(config.groups), "groups must be an array");

  assert(typeof config.max_retry === "number", "max_retry must be a number");
  assert(config.max_retry >= 0, "max_retry must be non-negative");

  assert(
    typeof config.retry_interval === "number",
    "retry_interval must be a number",
  );
  assert(config.retry_interval >= 0, "retry_interval must be non-negative");

  assert(typeof config.handlers === "object", "handlers must be an object");
}

function loadConfig() {
  const config = readConfig();
  verifyConfig(config);
  log("api_token:", config.api_token);
  return config as Config;
}

let CONFIG: Config;

export function get_config() {
  if (!CONFIG) {
    CONFIG = loadConfig();
    on_config_change();
  }
  return CONFIG;
}

const configWatcher = Deno.watchFs("data/");
const reloadConfig = debounce(() => {
  try {
    CONFIG = loadConfig();
    on_config_change();
    log("config reloaded");
  } catch (e) {
    error(e);
  }
}, 50);

(async () => {
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
})();
