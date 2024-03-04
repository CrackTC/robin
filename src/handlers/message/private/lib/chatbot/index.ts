import db from "/db.ts";
import {
  // mk_reply,
  mk_text,
  send_private_message,
} from "/onebot/index.ts";
import { PrivateMessageEvent } from "/onebot/types/event/message.ts";
import { error } from "/utils.ts";
import { rate_limit, task_queue, wrap } from "/wrappers.ts";
import { HandlerConfig } from "/handlers/common.ts";
import {
  PrivateEventHandleFunc,
  PrivateEventHandler,
} from "/handlers/message/private/types.ts";
import { ChatBotClient, ChatBotMessage } from "./common.ts";
import { GeminiChatBotClient } from "./gemini.ts";
import { OpenAIChatBotClient } from "./openai.ts";

const NAME = "chatbot";
const config = new HandlerConfig(NAME, {
  openai_api_key: "",
  gemini_api_key: "",
  rate_limit_per_hour: 10,
  model: "gemini-pro",
  model_regex_string: "^切换模型 *([\\s\\S]*)$",
  system_regex_string: "^切换预设 *([\\s\\S]*)$",
  clear_regex_string: "^重置会话$",
  rollback_regex_string: "^回滚会话$",
  model_reply: "切换模型成功",
  system_reply: "切换预设成功",
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

db.execute(`
  CREATE TABLE IF NOT EXISTS ${NAME}_system (
    user_id INTEGER NOT NULL PRIMARY KEY,
    system TEXT NOT NULL
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
  if (results.length === 0 || results[0][0] === "") return config.value.model;
  return results[0][0];
};

const set_model = (user_id: number, model: string) => {
  db.query(
    `INSERT INTO ${NAME}_model (user_id, model) VALUES (?, ?)
        ON CONFLICT(user_id) DO UPDATE SET model = ?`,
    [user_id, model, model],
  );
};

const get_system = (user_id: number) => {
  const results = db.query<[string]>(
    `SELECT system FROM ${NAME}_system WHERE user_id = ?`,
    [user_id],
  );
  return results.length > 0 ? results[0][0] : "";
};

const set_system = (user_id: number, system: string) => {
  db.query(
    `INSERT INTO ${NAME}_system (user_id, system) VALUES (?, ?)
        ON CONFLICT(user_id) DO UPDATE SET system = ?`,
    [user_id, system, system],
  );
};

let client: ChatBotClient;
let model_regex: RegExp;
let system_regex: RegExp;
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

  message = message.trim();
  if (message.length === 0) return;

  if (clear_regex.test(message)) {
    remove_all(event.user_id);
    send_private_message(event.user_id, [
      // mk_reply(event),
      mk_text(config.value.clear_reply),
    ]);
    return;
  }

  if (rollback_regex.test(message)) {
    remove_last(event.user_id);
    send_private_message(event.user_id, [
      // mk_reply(event),
      mk_text(config.value.rollback_reply),
    ]);
    return;
  }

  if (model_regex.test(message)) {
    const model = message.match(model_regex)?.[1];
    if (model) {
      set_model(event.user_id, model);
      send_private_message(event.user_id, [
        // mk_reply(event),
        mk_text(config.value.model_reply),
      ]);
      return;
    }
  }

  if (system_regex.test(message)) {
    const system = message.match(system_regex)?.[1];
    if (system) {
      set_system(event.user_id, system);
      send_private_message(event.user_id, [
        // mk_reply(event),
        mk_text(config.value.system_reply),
      ]);
      return;
    }
  }

  const model = get_model(event.user_id);
  const system = get_system(event.user_id);

  const messages: ChatBotMessage[] = [];
  if (system !== "") messages.push({ role: "system", content: system });
  messages.push(...get_history(event.user_id) as ChatBotMessage[]);
  messages.push({ role: "user", content: message });

  const time = Date.now();
  client.get_reply(model, messages)
    .catch((err) => {
      error(err);
      return null;
    })
    .then((res) => {
      if (!res) {
        send_private_message(event.user_id, [
          // mk_reply(event),
          mk_text(config.value.error_reply),
        ]);
        return;
      }

      add_history(event.user_id, "user", message, time);
      add_history(event.user_id, "assistant", res);
      send_private_message(event.user_id, [
        // mk_reply(event),
        mk_text(res),
      ]);
    });
};

export default new PrivateEventHandler({
  name: NAME,
  on_config_change: (new_config) => {
    config.on_config_change(new_config);
    model_regex = new RegExp(config.value.model_regex_string);
    system_regex = new RegExp(config.value.system_regex_string);
    clear_regex = new RegExp(config.value.clear_regex_string);
    rollback_regex = new RegExp(config.value.rollback_regex_string);

    if (config.value.openai_api_key) {
      client = new OpenAIChatBotClient(config.value.openai_api_key);
    } else {
      client = new GeminiChatBotClient(config.value.gemini_api_key);
    }
  },
  handle_func: wrap<PrivateEventHandleFunc>(handle_func)
    .with(task_queue)
    .with(rate_limit({
      get_limit: () => config.value.rate_limit_per_hour,
      get_period: () => 3600 * 1000,
      get_id: (event) => event.user_id,
      exceed_action: (event, wait) => {
        send_private_message(event.user_id, [
          // mk_reply(event),
          mk_text(config.value.limit_reply.replace("{}", wait.toString())),
        ]);
      },
    })).call,
});
