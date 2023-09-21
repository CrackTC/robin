import { encode } from "https://deno.land/std@0.202.0/encoding/base64.ts";
import { cron } from "https://deno.land/x/deno_cron@v1.0.0/cron.ts";

class Config {
  port: number;
  api_addr: string;
  groups: number[];
  cron: string;
  constructor(port: number, api_addr: string, groups: number[], cron: string) {
    this.port = port;
    this.api_addr = api_addr;
    this.groups = groups;
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

  const cron = Deno.env.get("CRON") ?? "1 0 0 * * *";

  return new Config(port, api_addr, groups, cron);
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

      json.message.forEach(
        (element: { type: string; data: { text: string } }) => {
          console.log(JSON.stringify(element));
          if (element.type == "text") messages.push(element.data.text);
        },
      );
    }
    return new Response(null, { status: 204 });
  };

  Deno.serve({ port: config.port }, handler);

  const command = new Deno.Command("python3", {
    args: ["./word_cloud.py"],
    stdin: "piped",
    stdout: "null",
  });

  cron(config.cron, () => {
    let task = Promise.resolve();

    const encoder = new TextEncoder();
    const url = config.api_addr + "/send_group_msg";
    Object.entries(context).forEach(([group_id_str, ctx]) => {
      const all_msg = ctx.messages.join("\n");
      const group_id = Number(group_id_str);
      const child = command.spawn();

      const writer = child.stdin.getWriter();
      writer.write(encoder.encode(all_msg)).then(() => writer.releaseLock())
        .then(() => child.stdin.close());

      task = task.then(() =>
        child.status.then((status) => {
          if (!status.success) {
            console.error(
              `child process exited with non-zero status code ${status.code}`,
            );
            return;
          } else {
            fetch(url, {
              method: "POST",
              headers: new Headers({ "Content-Type": "application/json" }),
              body: JSON.stringify({
                group_id: group_id,
                message: get_image_cqcode("./result.png"),
              }),
            }).then((response) => {
              response.json().then((json) => {
                if (json.status == "failed") {
                  console.error(`send image failed: ${json.msg}`);
                } else {
                  fetch(url, {
                    method: "POST",
                    headers: new Headers({
                      "Content-Type": "application/json",
                    }),
                    body: JSON.stringify({
                      group_id: group_id,
                      message: get_description(ctx),
                      auto_escape: false,
                    }),
                  });
                }
              });
            });
          }
        })
      );
    });

    context = new Context(config);
  });
}

init();
