import { config, on_config_change } from "./config.ts";
import {
  cq_image,
  is_at_self,
  Report,
  send_group_at_message,
} from "../../cqhttp.ts";

const handle_func = async (report: Report) => {
  if (!is_at_self(report.message)) return;

  const text_len = config.texts.length;
  const image_len = config.image_paths.length;
  const rand = Math.floor(Math.random() * (text_len + image_len));

  const is_text = rand < text_len;

  const entry = is_text
    ? config.texts[rand]
    : config.image_paths[rand - text_len];

  const reply = is_text ? entry : cq_image(Deno.readFileSync(entry));
  await send_group_at_message(report.group_id, reply, report.sender.user_id);
};

export default {
  name: "rand_reply",
  handle_func,
  on_config_change,
};
