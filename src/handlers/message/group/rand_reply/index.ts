import {
  is_at_self,
  mk_at,
  mk_image,
  mk_reply,
  mk_text,
  send_group_message,
} from "../../../../onebot/cqhttp.ts";
import { GroupMessageEvent } from "../../../../onebot/types/event/message.ts";
import { HandlerConfig } from "../../../common.ts";
import { GroupEventHandler } from "../types.ts";

const config = new HandlerConfig("rand_reply", {
  texts: [] as string[],
  image_paths: [] as string[],
});

const handle_func = async (event: GroupMessageEvent) => {
  if (!is_at_self(event.message)) return;

  const text_len = config.value.texts.length;
  const image_len = config.value.image_paths.length;
  const rand = Math.floor(Math.random() * (text_len + image_len));

  const is_text = rand < text_len;

  const entry = is_text
    ? config.value.texts[rand]
    : config.value.image_paths[rand - text_len];

  const content = is_text ? mk_text(entry) : mk_image(Deno.readFileSync(entry));
  await send_group_message(event.group_id, [
    mk_reply(event),
    mk_at(event.user_id),
    content,
  ]);
};

export default new GroupEventHandler({
  name: "rand_reply",
  handle_func,
  on_config_change: config.on_config_change,
});
