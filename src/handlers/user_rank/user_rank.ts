import { CONFIG } from "../../config.ts";
import { Report } from "../base.ts";
import { backup, error, log } from "../../utils.ts";
import { cron } from "https://deno.land/x/deno_cron@v1.0.0/cron.ts";
import { send_group_message } from "../../cqhttp.ts";

class GroupStat {
  user_rank: { [nickname: string]: number };

  get_user_stats() {
    return Object.entries(this.user_rank).map(([name, count]) => ({
      name,
      count,
    }));
  }

  constructor() {
    this.user_rank = {};
  }
}

class Context {
  [group_id: number]: GroupStat;

  init() {
    CONFIG.groups.forEach((group_id) => {
      this[group_id] = new GroupStat();
    });
  }

  constructor() {
    this.init();
  }
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

  const entries: UserStat[] = Object
    .entries(stat.user_rank)
    .map(([name, count]) => ({ name, count }));
  const people_count = entries.length;
  const msg_count = entries.map(({ count }) => count).reduce((l, r) => l + r);
  const rank = get_top_n(entries, 10);

  return get_description_text(people_count, msg_count, rank);
}

export const user_rank_handler = (report: Report) => {
  const group_id = report.group_id;
  const name: string = report.sender.card != ""
    ? report.sender.card
    : report.sender.nickname;
  const { user_rank } = context[group_id];

  if (name in user_rank) user_rank[name]++;
  else user_rank[name] = 1;
};

let task = Promise.resolve();

const context = new Context();

cron(CONFIG.cron, () => {
  CONFIG.groups.forEach((group_id) => {
    task = task.then(async () => {
      const desc = get_description(context[group_id]);
      const success = await send_group_message(group_id, desc, false);
      if (!success) {
        error(`send description failed`);
        backup(desc, "result.txt");
      }
    });
  });

  task = task.then(() => {
    context.init();
  });
});
