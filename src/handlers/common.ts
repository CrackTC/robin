import { Config, config_events, get_config } from "../config.ts";
import { import_dir, log } from "../utils.ts";
import { event_handlers } from "./index.ts";
import { EventHandler } from "./types.ts";

export const load_handlers_from_url = async (category: string, url: string) => {
  for await (const { module } of import_dir(url)) {
    const item: EventHandler = module.default;
    event_handlers[item.name] = item;
    if (item.on_config_change) {
      item.on_config_change(get_config());
      config_events.on("change", item.on_config_change);
    }
    log(`loaded ${category} handler ${item.name}`);
  }
};

export class HandlerConfig<TConfig extends object> {
  private _config: TConfig;
  private _on_config_change: (config: Config) => void;
  get value() {
    return this._config;
  }
  get on_config_change() {
    return this._on_config_change;
  }

  constructor(name: string, default_config: TConfig) {
    this._config = Object.assign({}, default_config);
    this._on_config_change = (config: Config) =>
      this._config = { ...default_config, ...config.handlers[name] };
  }
}
