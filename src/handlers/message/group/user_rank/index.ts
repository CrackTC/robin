import Cron from "https://deno.land/x/croner@8.0.0/src/croner.js";
import db from "../../../../db.ts";
import { mk_text, send_group_message } from "../../../../onebot/cqhttp.ts";
import { GroupMessageEvent } from "../../../../onebot/types/event/message.ts";
import { backup, error } from "../../../../utils.ts";
import { HandlerConfig } from "../../../common.ts";
import { get_group_event_handler } from "../index.ts";
import { GroupEventHandler } from "../types.ts";

const NAME = "user_rank";
const config = new HandlerConfig(NAME, {
  cron: "0 0 0 * * *",
});

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

const handle_func = (event: GroupMessageEvent) => {
  const group_id = event.group_id;
  const name = event.sender.card != null
    ? event.sender.card
    : event.sender.nickname;
  insert(group_id, name);
};

const send_description = async (group_id: number) => {
  const desc = get_description(group_id);
  clear_group(group_id);
  const success = await send_group_message(group_id, [mk_text(desc)]);
  if (!success) {
    error("send description failed");
    backup(desc, `${NAME}.txt`);
  }
};

let job: Cron;

export default new GroupEventHandler({
  name: NAME,
  handle_func,
  on_config_change: (new_config) => {
    config.on_config_change(new_config);
    const info = get_group_event_handler(NAME);
    if (info === null) return;

    if (job !== undefined) job.stop();
    job = new Cron(config.value.cron, { name: NAME }, () => {
      if (info.enabled) info.groups.forEach(send_description);
    });
  },
});
