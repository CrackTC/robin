import OpenAI from "https://deno.land/x/openai@v4.24.5/mod.ts";
import { ChatCompletionMessageParam } from "https://deno.land/x/openai@v4.24.5/resources/mod.ts";
import db from "../../../../db.ts";
import {
  mk_reply,
  mk_text,
  send_private_message,
} from "../../../../onebot/cqhttp.ts";
import { PrivateMessageEvent } from "../../../../onebot/types/event/message.ts";
import { error } from "../../../../utils.ts";
import { rate_limit, task_queue, wrap } from "../../../../wrappers.ts";
import { HandlerConfig } from "../../../common.ts";
import { PrivateEventHandleFunc, PrivateEventHandler } from "../types.ts";

const NAME = "chatbot";
const config = new HandlerConfig(NAME, {
  openai_api_key: "",
  rate_limit_per_hour: 10,
  model: "gpt-4-1106-preview",
  model_regex_string: "^切换模型 ?(.+)$",
  clear_regex_string: "^重置会话$",
  rollback_regex_string: "^回滚会话$",
  model_reply: "切换模型成功",
  clear_reply: "重置会话成功",
  rollback_reply: "回滚会话成功",
  error_reply: "发生错误，请重试",
  limit_reply: "说话太快啦～，再等{}秒吧",
});

db.execute(`
  CREATE TABLE IF NOT EXISTS ${NAME} (
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  )
`);

db.execute(`
  CREATE TABLE IF NOT EXISTS ${NAME}_model (
    user_id INTEGER NOT NULL PRIMARY KEY,
    model TEXT NOT NULL
  )
`);

const remove_last = (user_id: number) => {
  db.query(
    `
    DELETE FROM ${NAME}
    WHERE timestamp IN (
      SELECT timestamp FROM ${NAME}
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT 2
    ) AND user_id = ?
    `,
    [user_id, user_id],
  );
};

const remove_all = (user_id: number) => {
  db.query(`DELETE FROM ${NAME} WHERE user_id = ?`, [user_id]);
};

const get_history = (user_id: number) =>
  db.query<[string, string]>(
    `SELECT role, content FROM ${NAME} WHERE user_id = ? ORDER BY timestamp ASC`,
    [user_id],
  ).map(([role, content]) => ({ role, content }));

const add_history = (
  user_id: number,
  role: string,
  content: string,
  time: number = Date.now(),
) => {
  db.query(
    `INSERT INTO ${NAME} (user_id, role, content, timestamp)
        VALUES (?, ?, ?, ?)`,
    [user_id, role, content, time],
  );
};

const get_model = (user_id: number) => {
  const results = db.query<[string]>(
    `SELECT model FROM ${NAME}_model WHERE user_id = ?`,
    [user_id],
  );
  return results.length > 0 ? results[0][0] : config.value.model;
};

const set_model = (user_id: number, model: string) => {
  db.query(
    `INSERT INTO ${NAME}_model (user_id, model) VALUES (?, ?)
        ON CONFLICT(user_id) DO UPDATE SET model = ?`,
    [user_id, model, model],
  );
};

let client: OpenAI;
let model_regex: RegExp;
let clear_regex: RegExp;
let rollback_regex: RegExp;

const handle_func = (event: PrivateMessageEvent) => {
  let message: string;
  if (typeof event.message === "string") {
    message = event.message;
  } else {
    message = event.message.map((seg) =>
      seg.type === "text" ? seg.data.text : ""
    ).join(" ");
  }

  if (clear_regex.test(message)) {
    remove_all(event.user_id);
    send_private_message(event.user_id, [
      mk_reply(event),
      mk_text(config.value.clear_reply),
    ]);
    return;
  }

  if (rollback_regex.test(message)) {
    remove_last(event.user_id);
    send_private_message(event.user_id, [
      mk_reply(event),
      mk_text(config.value.rollback_reply),
    ]);
    return;
  }

  if (model_regex.test(message)) {
    const model = message.match(model_regex)?.[1];
    if (model) {
      set_model(event.user_id, model);
      send_private_message(event.user_id, [
        mk_reply(event),
        mk_text(config.value.model_reply),
      ]);
      return;
    }
  }

  message = message.trim();
  if (message.length === 0) return;

  const model = get_model(event.user_id);
  const messages = get_history(event.user_id) as ChatCompletionMessageParam[];
  messages.push({ role: "user", content: message });

  const time = Date.now();
  client.chat.completions.create({ messages, model })
    .catch((err) => {
      error(err);
      send_private_message(event.user_id, [
        mk_reply(event),
        mk_text(config.value.error_reply),
      ]);
      return null;
    })
    .then((res) => {
      if (res === null) return;
      const reply = res.choices[0].message;
      add_history(event.user_id, "user", message, time);
      add_history(event.user_id, reply.role, reply.content ?? "");
      send_private_message(event.user_id, [
        mk_reply(event),
        mk_text(reply.content ?? ""),
      ]);
    });
};

export default new PrivateEventHandler({
  name: NAME,
  on_config_change: (new_config) => {
    config.on_config_change(new_config);
    client = new OpenAI({ apiKey: config.value.openai_api_key });
    model_regex = new RegExp(config.value.model_regex_string);
    clear_regex = new RegExp(config.value.clear_regex_string);
    rollback_regex = new RegExp(config.value.rollback_regex_string);
  },
  handle_func: wrap<PrivateEventHandleFunc>(handle_func)
    .with(task_queue)
    .with(rate_limit({
      get_limit: () => config.value.rate_limit_per_hour,
      get_period: () => 3600 * 1000,
      get_id: (event) => event.user_id,
      exceed_action: (event, wait) => {
        send_private_message(event.user_id, [
          mk_reply(event),
          mk_text(config.value.limit_reply.replace("{}", wait.toString())),
        ]);
      },
    })).call,
});
