import { get_config } from "../../../../config.ts";

class Config {
  cron = "0 0 0 * * *";
}

export const config = new Config();

export const on_config_change = () =>
  Object.assign(config, new Config(), get_config().handlers.word_cloud);
