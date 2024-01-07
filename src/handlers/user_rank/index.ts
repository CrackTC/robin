import Cron from "https://deno.land/x/croner@8.0.0/src/croner.js";
import db from "../../db.ts";
import { get_handler_info } from "../base.ts";
import { backup, error } from "../../utils.ts";
import { config, on_config_change as base_config_change } from "./config.ts";
import { Report, send_group_message } from "../../cqhttp.ts";

const NAME = "user_rank";

db.execute(`
  CREATE TABLE IF NOT EXISTS ${NAME} (
    group_id INTEGER NOT NULL,
    nickname TEXT NOT NULL
  )
`);

const insert = (group_id: number, nickname: string) =>
  db.query(
    `INSERT INTO ${NAME} (group_id, nickname) VALUES (?, ?)`,
    [group_id, nickname],
  );

const get_top_n = (group_id: number, n: number) =>
  db.query<[string, number]>(
    `
    SELECT nickname, COUNT(*) AS count
    FROM ${NAME}
    GROUP BY nickname
    HAVING group_id = ?
    ORDER BY count DESC
    LIMIT ?`,
    [group_id, n],
  );

const get_people_count = (group_id: number) =>
  db.query<[number]>(
    `SELECT COUNT(DISTINCT nickname) FROM ${NAME} WHERE group_id = ?`,
    [group_id],
  )[0][0];

const get_msg_count = (group_id: number) =>
  db.query<[number]>(
    `SELECT COUNT(*) FROM ${NAME} WHERE group_id = ?`,
    [group_id],
  )[0][0];

const clear_group = (group_id: number) =>
  db.query(`DELETE FROM ${NAME} WHERE group_id = ?`, [group_id]);

const get_description_text = (
  peoples: number,
  messages: number,
  rank: [string, number][],
) =>
  `本群 ${peoples} 位朋友共产生 ${messages} 条发言\n` +
  "活跃用户排行榜" +
  rank.map(([name, count]) => `\n${name} 贡献: ${count}`);

const get_description = (group_id: number) => {
  const people_count = get_people_count(group_id);
  if (people_count == 0) return "本群无人发言";

  const msg_count = get_msg_count(group_id);
  const rank = get_top_n(group_id, 10);

  return get_description_text(people_count, msg_count, rank);
};

const handle_func = (report: Report) => {
  const group_id = report.group_id;
  const name: string = report.sender.card != ""
    ? report.sender.card
    : report.sender.nickname;
  insert(group_id, name);
};

const send_description = async (group_id: number) => {
  const desc = get_description(group_id);
  clear_group(group_id);
  const success = await send_group_message(group_id, desc, false);
  if (!success) {
    error("send description failed");
    backup(desc, `${NAME}.txt`);
  }
};

let job: Cron;

const on_config_change = () => {
  base_config_change();
  const info = get_handler_info(NAME);
  if (job !== undefined) job.stop();
  job = new Cron(config.cron, { name: NAME }, () => {
    if (info.enabled) info.groups.forEach(send_description);
  });
};

export default {
  name: NAME,
  handle_func,
  on_config_change,
};
