import Cron from "https://deno.land/x/croner@8.0.0/src/croner.js";
import { Report } from "../base.ts";
import { backup, error, spawn_set_input } from "../../utils.ts";
import { config, on_config_change as base_config_change } from "./config.ts";
import {
  cq_image,
  remove_cqcode,
  send_group_message,
  unescape_non_cq,
} from "../../cqhttp.ts";
import { task_queue, wrap } from "../../wrappers.ts";

class Context {
  [group_id: number]: string[];
}

const context = new Context();
const groups: number[] = [];

function wordcloud_handler(report: Report) {
  const group_id = report.group_id;
  if (groups.includes(group_id)) {
    if (!(group_id in context)) context[group_id] = [];

    const message = unescape_non_cq(remove_cqcode(report.message));
    context[group_id].push(message);
  }
  return Promise.resolve();
}

const IMAGE_PATH = "/dev/shm/word_cloud.png";
const WORD_CLOUD_PY = "./handlers/word_cloud/word_cloud.py";

let job: Cron;

async function send_word_cloud(group_id: number) {
  const messages = context[group_id] ?? [];
  context[group_id] = [];
  if (messages.length === 0) return;

  await spawn_set_input([
    "python3",
    WORD_CLOUD_PY,
    `--output=${IMAGE_PATH}`,
  ], messages.join("\n"));

  const image = await Deno.readFile(IMAGE_PATH);
  const success = await send_group_message(
    group_id,
    cq_image(image),
    true,
  );
  if (!success) {
    error("send image failed");
    backup(image, "word_cloud.png");
  }

  Deno.remove(IMAGE_PATH);
}

const send_queued = wrap(send_word_cloud)
  .with(task_queue)
  .call as typeof send_word_cloud;

function on_config_change() {
  base_config_change();
  if (job !== undefined) job.stop();
  job = new Cron(config.cron, { name: "word_cloud" }, () => {
    groups.forEach(send_queued);
  });
}

export default {
  handle_func: wordcloud_handler,
  groups,
  on_config_change,
};
