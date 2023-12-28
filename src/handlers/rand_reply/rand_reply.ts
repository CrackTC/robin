import { Report } from "../base.ts";
import { cq_image, is_at_self, send_group_at_message } from "../../cqhttp.ts";
import { register_handler } from "../base.ts";
import { config, on_config_change } from "./config.ts";

const groups: number[] = [];

async function rand_reply_handler(report: Report) {
  if (is_at_self(report.message) && groups.includes(report.group_id)) {
    const sender_id = report.sender.user_id;

    const text_len = config.texts.length;
    const image_len = config.image_paths.length;
    const rand = Math.floor(Math.random() * (text_len + image_len));

    const is_text = rand < text_len;

    const entry = is_text
      ? config.texts[rand]
      : config.image_paths[rand - text_len];

    let reply = entry;
    if (!is_text) {
      reply = cq_image(Deno.readFileSync(entry));
    }

    await send_group_at_message(report.group_id, reply, sender_id);
  }
}

register_handler({
  handle_func: rand_reply_handler,
  groups,
  on_config_change,
});
