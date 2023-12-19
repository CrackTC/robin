import { encode } from "https://deno.land/std@0.202.0/encoding/base64.ts";
import { cron } from "https://deno.land/x/deno_cron@v1.0.0/cron.ts";

class Config {
  port: number;
  api_addr: string;
  groups: number[];
  max_retry: number;
  retry_interval: number;
  cron: string;

  constructor(
    port: number,
    api_addr: string,
    groups: number[],
    max_retry: number,
    retry_interval: number,
    cron: string,
  ) {
    this.port = port;
    this.api_addr = api_addr;
    this.groups = groups;
    this.max_retry = max_retry;
    this.retry_interval = retry_interval;
    this.cron = cron;
  }
}

class Context {
  [group_id: number]: {
    user_rank: { [nickname: string]: number };
    messages: string[];
  };

  public constructor(config: Config) {
    config.groups.forEach((group_id) => {
      this[group_id] = { user_rank: {}, messages: [] };
    });
  }
}

function get_config(): Config {
  const port = Number(Deno.env.get("PORT") ?? 3101);

  const api_addr = Deno.env.get("API_ADDR") ?? "";
  if (api_addr == "") throw new Error("API_ADDR cannot be undefined");

  const groups =
    Deno.env.get("GROUPS")?.split(":").map((group_id_str) =>
      Number(group_id_str)
    ) ?? [];
  if (groups.length == 0) throw new Error("GROUPS cannot be undefined");

  const max_retry = Number(Deno.env.get("MAX_RETRY") ?? 5);
  const retry_interval = Number(Deno.env.get("RETRY_INTERVAL") ?? 30);
  const cron = Deno.env.get("CRON") ?? "1 0 0 * * *";

  return new Config(port, api_addr, groups, max_retry, retry_interval, cron);
}

function init() {
  const config = get_config();
  run(config);
}

function get_image_cqcode(path: string) {
  const base64 = encode(Deno.readFileSync(path));
  return `[CQ:image,file=base64://${base64}]`;
}

function get_description(ctx: { user_rank: { [nickname: string]: number } }) {
  console.log(JSON.stringify(ctx));
  const entries = Object.entries(ctx.user_rank);
  const people_count = entries.length;
  const msg_count = entries.map(([_, count]) => count).reduce(
    (prev, cur) => prev + cur,
    0,
  );
  entries.sort(([_, count_a], [__, count_b]) => count_b - count_a);
  const rank = entries.length <= 10 ? entries : entries.slice(0, 10);
  return `本群 ${people_count} 位朋友共产生 ${msg_count} 条发言\n活跃用户排行榜\n${
    rank.map(([name, count]) => `${name} 贡献: ${count}`).join("\n")
  }`;
}

async function is_failed(response: Response) {
  return (await response.json()).status == "failed";
}

function sleep(s: number) {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
}

async function send_group_message(
  config: Config,
  group_id: number,
  message: string,
  parse_cq: boolean,
) {
  const url = config.api_addr + "/send_group_msg";
  const headers = new Headers({ "Content-Type": "application/json" });

  for (let i = 0; i < config.max_retry + 1; i++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          group_id,
          message,
          auto_escape: !parse_cq,
        }),
      });
      if (await is_failed(response)) {
        console.warn(
          `send message failed: ${await response
            .text()}\nretry in ${config.retry_interval} seconds`,
        );
        await sleep(config.retry_interval);
      } else {
        return true;
      }
    } catch (e) {
      console.warn(
        `send message failed: ${e}\nretry in ${config.retry_interval} seconds`,
      );
      await sleep(config.retry_interval);
    }
  }

  console.error(
    `failed to send message to group ${group_id} after ${config.max_retry} retries`,
  );
  return false;
}

function get_time() {
  const date = new Date();
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ].map((num) => num.toString().padStart(2, "0")).join("");
}

function get_backup_name(name: string) {
  return [get_time(), crypto.randomUUID(), name].join(".");
}

function run(config: Config) {
  const msgPredicate = (
    json: {
      post_type: string;
      message_type?: string;
      sub_type?: string;
      group_id?: number;
    },
  ) =>
    (json.post_type == "message" || json.post_type == "message_sent") &&
    json.message_type == "group" &&
    json.sub_type == "normal" && config.groups.includes(json.group_id ?? 0);

  let context = new Context(config);

  const CQ_REG = /\[CQ:[^\]]+\]/g;

  const handler = async (request: Request) => {
    const json = await request.json();

    if (msgPredicate(json)) {
      console.log(JSON.stringify(json));
      const group_id: number = json.group_id;
      const nickname: string = json.sender.card != ""
        ? json.sender.card
        : json.sender.nickname;
      const user_rank = context[group_id].user_rank;
      const messages = context[group_id].messages;

      if (nickname in user_rank) user_rank[nickname]++;
      else user_rank[nickname] = 1;

      let message : string = json.message;
      message = message.replaceAll(CQ_REG, "");
      console.log(message);
      messages.push(message);
    }
    return new Response(null, { status: 204 });
  };

  Deno.serve({ port: config.port }, handler);

  const command = new Deno.Command("python3", {
    args: ["./word_cloud.py"],
    stdin: "piped",
    stdout: "null",
  });

  let task = Promise.resolve();

  cron(config.cron, () => {
    Object.entries(context).forEach(([group_id_str, ctx]) => {
      task = task.then(async () => {
        const all_msg = ctx.messages.join("\n");
        const group_id = Number(group_id_str);

        const child = command.spawn();
        const writer = child.stdin.getWriter();

        await writer.write(new TextEncoder().encode(all_msg));
        writer.releaseLock();
        child.stdin.close();

        const status = await child.status;
        if (!status.success) {
          console.error(
            `child process exited with non-zero status code ${status.code}`,
          );
          return;
        }

        const img = get_image_cqcode("./result.png");
        let success = await send_group_message(config, group_id, img, true);
        if (!success) {
          const backup_name = get_backup_name("result.png");
          Deno.renameSync("./result.png", backup_name);
          console.log(`send image failed, backup to ${backup_name}`);
        }

        const desc = get_description(ctx);
        success = await send_group_message(config, group_id, desc, false);
        if (!success) {
          const backup_name = get_backup_name("result.txt");
          Deno.writeTextFileSync(backup_name, desc);
          console.log(`send description failed, backup to ${backup_name}`);
        }
      });
    });

    task = task.then(() => {
      context = new Context(config);
    });
  });
}

init();
