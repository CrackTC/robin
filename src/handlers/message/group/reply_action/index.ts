import { get_msg } from "../../../../onebot/cqhttp.ts";
import { mk_text, send_group_message } from "../../../../onebot/cqhttp.ts";
import { GroupMessageEvent } from "../../../../onebot/types/event/message.ts";
import { Message } from "../../../../onebot/types/message.ts";
import { GroupEventHandler } from "../types.ts";
import { error } from "../../../../utils.ts";
import { get_group_member_info } from "../../../../onebot/cqhttp.ts";

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
    ? message.replace(/\[CQ:[^\]]*\]/, "").trim()
    : message.map((seg) => seg.type === "text" ? seg.data.text.trim() : "")
      .join("");

const handle_func = async (event: GroupMessageEvent) => {
  const text = get_text(event.message);
  if (!text.startsWith("/")) return;

  const parts = text.slice(1).split(" ");
  if (parts.length == 0) return;

  const reply_id = get_reply_id(event.message);
  if (!reply_id) return;

  const source_name = event.sender.card ?? event.sender.nickname;

  const msg = await get_msg(parseInt(reply_id));
  if (!msg) {
    error("failed to get message");
    return;
  }
  const info = await get_group_member_info(event.group_id, msg.sender.user_id);
  if (!info) {
    error("failed to get member info");
    return;
  }

  const target_name = info.card ?? info.nickname;

  const message: Message = [
    mk_text(
      `${source_name} ${parts[0]} ${target_name}${
        parts.length > 1 ? " " + parts.slice(1).join(" ") : ""
      }`,
    ),
  ];

  send_group_message(event.group_id, message);
};

export default new GroupEventHandler({
  name: "reply_action",
  handle_func,
});
