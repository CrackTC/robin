import { Config } from "/config.ts";

export class EventHandler {
  name: string;
  type: string;
  enabled = true;
  on_config_change?: (config: Config) => void;

  constructor(
    name: string,
    type: string,
    on_config_change?: (config: Config) => void,
  ) {
    this.name = name;
    this.type = type;
    this.on_config_change = on_config_change;
  }
}
