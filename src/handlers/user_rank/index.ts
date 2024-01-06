import Cron from "https://deno.land/x/croner@8.0.0/src/croner.js";
import { get_handler_info } from "../base.ts";
import { backup, error } from "../../utils.ts";
import { config, on_config_change as base_config_change } from "./config.ts";
import { Report, send_group_message } from "../../cqhttp.ts";

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

const get_top_n = (user_stats: UserStat[], n: number) =>
  user_stats.toSorted((a, b) => b.count - a.count).slice(0, n);

const get_description_text = (
  peoples: number,
  messages: number,
  rank: UserStat[],
) =>
  `本群 ${peoples} 位朋友共产生 ${messages} 条发言\n` +
  "活跃用户排行榜" +
  rank.map(({ name, count }) => `\n${name} 贡献: ${count}`);

const get_description = (stat: GroupStat) => {
  const entries: UserStat[] = stat.get_user_stats();
  const people_count = entries.length;

  if (people_count == 0) return "本群无人发言";

  const msg_count = entries.map(({ count }) => count).reduce((l, r) => l + r);
  const rank = get_top_n(entries, 10);

  return get_description_text(people_count, msg_count, rank);
};

const handle_func = (report: Report) => {
  const group_id = report.group_id;
  if (!(group_id in context)) context[group_id] = new GroupStat();

  const name: string = report.sender.card != ""
    ? report.sender.card
    : report.sender.nickname;
  const { user_rank } = context[group_id];
  name in user_rank ? user_rank[name]++ : user_rank[name] = 1;
};

const context = new Context();

let job: Cron;

const send_description = async (group_id: number) => {
  const desc = get_description(context[group_id] ?? new GroupStat());
  context[group_id] = new GroupStat();
  const success = await send_group_message(group_id, desc, false);
  if (!success) {
    error("send description failed");
    backup(desc, "result.txt");
  }
};

const on_config_change = () => {
  base_config_change();
  const info = get_handler_info(NAME);
  if (job !== undefined) job.stop();
  job = new Cron(config.cron, { name: NAME }, () => {
    if (info.enabled) info.groups.forEach(send_description);
  });
};

const NAME = "user_rank";

export default {
  name: NAME,
  handle_func,
  on_config_change,
};
