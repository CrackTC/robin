import { get_msg } from "../../../../onebot/cqhttp.ts";
import {
  mk_at,
  mk_text,
  send_group_message,
} from "../../../../onebot/cqhttp.ts";
import { GroupMessageEvent } from "../../../../onebot/types/event/message.ts";
import { Message } from "../../../../onebot/types/message.ts";
import { GroupEventHandler } from "../types.ts";
import { error } from "../../../../utils.ts";

const reply_regex = /\[CQ:reply,id=(\d+)\]/;

const get_reply_id = (message: Message) => {
  if (typeof message === "string") {
    return message.match(reply_regex)?.[1];
  } else {
    for (const seg of message) if (seg.type === "reply") return seg.data.id;
  }
};

const get_text = (message: Message) =>
  typeof message === "string"
    ? message.replace(reply_regex, "").trim()
    : message.map((seg) => seg.type === "text" ? seg.data.text.trim() : "")
      .join("");

const handle_func = async (event: GroupMessageEvent) => {
  const text = get_text(event.message);
  if (!text.startsWith("/")) return;

  const parts = text.slice(1).split(" ", 2);
  if (parts.length == 0) return;

  const reply_id = get_reply_id(event.message);
  if (!reply_id) return;

  const msg = await get_msg(parseInt(reply_id));
  if (!msg) {
    error("failed to get message");
    return;
  }
  const target_id = msg.sender.user_id;

  const message: Message = [
    mk_at(event.sender.user_id),
    mk_text(" " + parts[0]),
    mk_at(target_id),
  ];

  if (parts.length > 1) message.push(mk_text(" " + parts[1]));
  send_group_message(event.group_id, message);
};

export default new GroupEventHandler({
  name: "reply_action",
  handle_func,
});
