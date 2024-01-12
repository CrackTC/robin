import { get_config } from "../../../../config.ts";

class Config {
  pixiv_refresh_token = "";
  openai_api_key = "";
  ill_input_match: string[] = [];
  rate_limit_per_hour = 10;
  model_tag = "gpt-4-1106-preview";
  model_ill = "gpt-4-vision-preview";
  reply_not_found = "再怎么找也找不到啦>_<";
  reply_limit = "说话太快啦～，再等{}秒吧";
}

export const config = new Config();

export const on_config_change = () =>
  Object.assign(config, new Config(), get_config().handlers.search_ill);
