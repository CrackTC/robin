import { get_config } from "../../../../config.ts";

class Config {
  openai_api_key = "";
  rate_limit_per_hour = 10;
  model = "gpt-4-1106-preview";
  model_regex_string = "^切换模型 ?(.+)$";
  clear_regex_string = "^重置会话$";
  rollback_regex_string = "^回滚会话$";
  model_reply = "切换模型成功";
  clear_reply = "重置会话成功";
  rollback_reply = "回滚会话成功";
  error_reply = "发生错误，请重试";
  limit_reply = "说话太快啦～，再等{}秒吧";
}

export const config = new Config();

export const on_config_change = () =>
  Object.assign(config, new Config(), get_config().handlers.chatbot);
