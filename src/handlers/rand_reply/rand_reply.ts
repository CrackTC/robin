import { Report } from "../base.ts";
import { cq_image, is_at_self, send_group_at_message } from "../../cqhttp.ts";

interface Word {
  word: string;
}

interface Image {
  path: string;
}

export const rand_reply_handler = (report: Report) => {
  if (is_at_self(report.message)) {
    const sender_id = report.sender.user_id;
    const rand = Math.floor(Math.random() * all_list.length);
    const entry = all_list[rand];

    let reply;
    if ("word" in entry) {
      reply = entry.word;
    } else {
      reply = cq_image(Deno.readFileSync(entry.path));
    }

    send_group_at_message(report.group_id, reply, sender_id);
  }
};

const WORD_LIST_PATH = "./data/word_list.json";
const IMAGE_LIST_PATH = "./data/image_list.json";
const word_list: Word[] = JSON.parse(Deno.readTextFileSync(WORD_LIST_PATH))
  .map((word: string) => ({ word }));
const image_list: Image[] = JSON.parse(Deno.readTextFileSync(IMAGE_LIST_PATH))
  .map((path: string) => ({ path }));
const all_list = [...word_list, ...image_list];
