import { config, on_config_change } from "./config.ts";
import {
  is_at_self,
  mk_image,
  mk_reply,
  mk_text,
  send_group_message,
} from "../../../../onebot/cqhttp.ts";
import { GroupMessageEvent } from "../../../../onebot/types/event/message.ts";
import { GroupEventHandler } from "../types.ts";

const handle_func = async (event: GroupMessageEvent) => {
  if (!is_at_self(event.message)) return;

  const text_len = config.texts.length;
  const image_len = config.image_paths.length;
  const rand = Math.floor(Math.random() * (text_len + image_len));

  const is_text = rand < text_len;

  const entry = is_text
    ? config.texts[rand]
    : config.image_paths[rand - text_len];

  const content = is_text ? mk_text(entry) : mk_image(Deno.readFileSync(entry));
  await send_group_message(event.group_id, [mk_reply(event), content]);
};

export default new GroupEventHandler({
  name: "rand_reply",
  handle_func,
  on_config_change,
});
