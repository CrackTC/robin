import { config, on_config_change as base_config_change } from "./config.ts";
import { Report } from "../base.ts";
import { backup, error, log } from "../../utils.ts";
import { send_group_message } from "../../cqhttp.ts";
import { register_handler } from "../base.ts";
import Cron from "https://deno.land/x/croner@8.0.0/src/croner.js";

class GroupStat {
  user_rank: { [nickname: string]: number } = {};

  get_user_stats() {
    return Object.entries(this.user_rank).map(([name, count]) => ({
      name,
      count,
    }));
  }
}

class Context {
  [group_id: number]: GroupStat;
}

interface UserStat {
  name: string;
  count: number;
}

function get_top_n(user_stats: UserStat[], n: number) {
  return user_stats.toSorted((a, b) => b.count - a.count).slice(0, n);
}

function get_description_text(
  peoples: number,
  messages: number,
  rank: UserStat[],
) {
  return `本群 ${peoples} 位朋友共产生 ${messages} 条发言\n` +
    "活跃用户排行榜" +
    rank.map(({ name, count }) => `\n${name} 贡献: ${count}`);
}

function get_description(stat: GroupStat) {
  log(JSON.stringify(stat));

  const entries: UserStat[] = stat.get_user_stats();
  const people_count = entries.length;

  if (people_count == 0) return "本群无人发言";

  const msg_count = entries.map(({ count }) => count).reduce((l, r) => l + r);
  const rank = get_top_n(entries, 10);

  return get_description_text(people_count, msg_count, rank);
}

export function user_rank_handler(report: Report) {
  const group_id = report.group_id;
  if (groups.includes(group_id)) {
    if (!(group_id in context)) context[group_id] = new GroupStat();

    const name: string = report.sender.card != ""
      ? report.sender.card
      : report.sender.nickname;
    const { user_rank } = context[group_id];

    if (name in user_rank) user_rank[name]++;
    else user_rank[name] = 1;
  }
  return Promise.resolve();
}

const groups: number[] = [];
const context = new Context();

let task = Promise.resolve();
let job: Cron;

function send_description(group_id: number) {
  task = task.then(async () => {
    const desc = get_description(context[group_id]);
    const success = await send_group_message(group_id, desc, false);
    if (!success) {
      error(`send description failed`);
      backup(desc, "result.txt");
    }
  });
}

function on_config_change() {
  base_config_change();
  if (job !== undefined) job.stop();
  job = new Cron(config.cron, { name: "user_rank" }, () => {
    groups.forEach((group_id) => {
      send_description(group_id);
      context[group_id] = new GroupStat();
    });
  });
}

register_handler({
  handle_func: user_rank_handler,
  groups,
  on_config_change,
});
