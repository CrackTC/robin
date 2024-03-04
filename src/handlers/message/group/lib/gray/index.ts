import { get_msg, mk_image, send_group_message } from "/onebot/index.ts";
import { GroupMessageEvent } from "/onebot/types/event/message.ts";
import { Message } from "/onebot/types/message.ts";
import { GroupEventHandler } from "/handlers/message/group/types.ts";
import { error } from "/utils.ts";
import { HandlerConfig } from "/handlers/common.ts";

const NAME = "gray";
const reply_regex = /\[CQ:reply,id=(\d+)\]/;
const config = new HandlerConfig(NAME, {
  keyword: "送走",
  api_address: "",
});

const get_reply_id = (message: Message) => {
  if (typeof message === "string") {
    return message.match(reply_regex)?.[1];
  } else {
    for (const seg of message) if (seg.type === "reply") return seg.data.id;
  }
};

const get_text = (message: Message) =>
  typeof message === "string"
    ? message.replace(/\[CQ:[^\]]*\]/, "").trim()
    : message.map((seg) => seg.type === "text" ? seg.data.text.trim() : "")
      .join("");

const handle_func = async (event: GroupMessageEvent) => {
  const text = get_text(event.message);
  if (!text.startsWith("/")) return;

  const parts = text.slice(1).split(" ");
  if (parts.length == 0) return;

  if (parts[0] !== config.value.keyword) return;

  const reply_id = get_reply_id(event.message);
  if (!reply_id) return;

  const msg = await get_msg(parseInt(reply_id));
  if (!msg) {
    error("failed to get message");
    return;
  }

  const resp = await fetch(
    `${config.value.api_address}/?id=${msg.sender.user_id}`,
  );

  if (!resp.ok) {
    error("gray api request failed");
    return;
  }

  const image = new Uint8Array(await resp.arrayBuffer());
  send_group_message(event.group_id, [mk_image(image)]);
};

export default new GroupEventHandler({
  name: NAME,
  handle_func,
  on_config_change: config.on_config_change,
});
