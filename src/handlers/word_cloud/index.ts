import Cron from "https://deno.land/x/croner@8.0.0/src/croner.js";
import db from "../../db.ts";
import { get_handler_info, GroupEventHandler } from "../base.ts";
import { backup, error, spawn_set_input } from "../../utils.ts";
import { config, on_config_change as base_config_change } from "./config.ts";
import { task_queue, wrap } from "../../wrappers.ts";
import { mk_image, send_group_message } from "../../onebot/cqhttp.ts";
import { GroupMessageEvent } from "../../onebot/types/event/message.ts";

const NAME = "word_cloud";

db.execute(`
  CREATE TABLE IF NOT EXISTS ${NAME} (
    group_id INTEGER NOT NULL,
    message TEXT NOT NULL
  )
`);

const insert = (group_id: number, message: string) =>
  db.query(
    `INSERT INTO ${NAME} (group_id, message) VALUES (?, ?)`,
    [group_id, message],
  );

const get_group_messages = (group_id: number) =>
  db.query<[string]>(
    `SELECT message FROM ${NAME} WHERE group_id = ?`,
    [group_id],
  ).map((row) => row[0]);

const clear_group = (group_id: number) =>
  db.query(
    `DELETE FROM ${NAME} WHERE group_id = ?`,
    [group_id],
  );

const handle_func = (event: GroupMessageEvent) => {
  const group_id = event.group_id;
  let message;
  if (typeof event.message === "string") {
    message = event.message;
  } else {
    message = event.message.map((seg) =>
      seg.type == "text" ? seg.data.text : ""
    ).join(" ");
  }
  insert(group_id, message);
};

const IMAGE_PATH = `/dev/shm/${NAME}.png`;
const WORD_CLOUD_PY = `./handlers/${NAME}/word_cloud.py`;

const send_word_cloud = async (group_id: number) => {
  const messages = get_group_messages(group_id);
  clear_group(group_id);
  if (messages.length === 0) return;

  await spawn_set_input([
    "python3",
    WORD_CLOUD_PY,
    `--output=${IMAGE_PATH}`,
  ], messages.join("\n"));

  const image = Deno.readFileSync(IMAGE_PATH);
  Deno.removeSync(IMAGE_PATH);
  const success = await send_group_message(group_id, [mk_image(image)]);
  if (!success) {
    error("send image failed");
    backup(image, `${NAME}.png`);
  }
};

let job: Cron;

const send_queued = wrap(send_word_cloud).with(task_queue).call;

const on_config_change = () => {
  base_config_change();
  const info = get_handler_info(NAME);
  if (job !== undefined) job.stop();
  job = new Cron(config.cron, { name: NAME }, () => {
    if (info.enabled) info.groups.forEach(send_queued);
  });
};

const word_cloud: GroupEventHandler = {
  name: NAME,
  handle_func,
  on_config_change,
};

export default word_cloud;
