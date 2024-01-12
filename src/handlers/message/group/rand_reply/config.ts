import { get_config } from "../../../../config.ts";

class Config {
  texts: string[] = [];
  image_paths: string[] = [];
}

export const config = new Config();

export const on_config_change = () =>
  Object.assign(config, new Config(), get_config().handlers.rand_reply);
