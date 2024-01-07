import Cron from "https://deno.land/x/croner@8.0.0/src/croner.js";
import db from "../../db.ts";
import { get_handler_info } from "../base.ts";
import { backup, error, spawn_set_input } from "../../utils.ts";
import { config, on_config_change as base_config_change } from "./config.ts";
import { task_queue, wrap } from "../../wrappers.ts";
import {
  cq_image,
  remove_cqcode,
  Report,
  send_group_message,
  unescape_non_cq,
} from "../../cqhttp.ts";

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

const handle_func = (report: Report) => {
  const group_id = report.group_id;
  const message = unescape_non_cq(remove_cqcode(report.message));
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
  const success = await send_group_message(group_id, cq_image(image), true);
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

export default {
  name: NAME,
  handle_func,
  on_config_change,
};
