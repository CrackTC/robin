import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { encode } from "https://deno.land/std@0.202.0/encoding/base64.ts";
import { error, log, spawn_get_output } from "../../utils.ts";
import { Report } from "../base.ts";
import PROMPTS from "./prompts.json" with { type: "json" };
import { config, on_config_change as base_config_change } from "./config.ts";
import { task_queue, wrap } from "../../wrappers.ts";

import {
  ChatCompletion,
  ChatCompletionContentPart,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "https://deno.land/x/openai@v4.24.0/resources/mod.ts";

import {
  cq_image,
  is_at_self,
  remove_cqcode,
  send_group_at_message,
  unescape_non_cq,
} from "../../cqhttp.ts";

class Context {
  [group_id: number]: number[];
  task_queue: Promise<void> = Promise.resolve();
}

async function search_ill(tags: string[], _report: Report) {
  // send_group_at_message(
  //   report.group_id,
  //   `using tags: [ ${tags} ]`,
  //   report.sender.user_id,
  // );
  while (true) {
    const output = await spawn_get_output(
      ["python3", SEARCH_ILL_PY, "search"].concat(tags),
    );

    if (output === undefined) {
      error("Search failed");
      return [];
    }

    const res: number[] = JSON.parse(output);
    if (res.length > 0) return res;

    if (tags.length == 0) return [];

    tags.pop();
    // send_group_at_message(
    //   report.group_id,
    //   `no illust found, using tags [ ${tags} ]`,
    //   report.sender.user_id,
    // );
  }
}

async function call_function(completion: ChatCompletion, report: Report) {
  if (completion.choices[0].message.tool_calls === undefined) {
    error("No tool calls");
    return [];
  }

  const fn = completion.choices[0].message.tool_calls[0].function;
  switch (fn.name) {
    case "search_ill":
      return await search_ill(JSON.parse(fn.arguments).tags, report);
  }
  return [];
}

async function download_small(ids: number[]) {
  const output = await spawn_get_output(
    ["python3", SEARCH_ILL_PY, "download_small"].concat(
      ids.map((id) => id.toString()),
    ),
  );

  if (output === undefined) {
    error("Download failed");
    return [];
  }

  return JSON.parse(output) as [string, string][];
}

async function download_large(ids: number[]) {
  const output = await spawn_get_output(
    ["python3", SEARCH_ILL_PY, "download"].concat(
      ids.map((id) => id.toString()),
    ),
  );
  if (output === undefined) {
    error("Download failed");
    return [];
  }

  return JSON.parse(output) as [string, string][];
}

async function get_tag_reply(input: string) {
  const tag_reply = await client.chat.completions.create({
    model: config.model_tag,
    messages: [TAG_PROMPT, {
      role: "user",
      content: input,
    }],
    tools: [SEARCH_ILL],
    tool_choice: SEARCH_ILL,
  });
  log(JSON.stringify(tag_reply.choices[0].message.tool_calls));
  return tag_reply;
}

async function get_choice_reply(image_contents: ChatCompletionContentPart[]) {
  const choice_body: ChatCompletionCreateParamsNonStreaming = {
    model: config.model_ill,
    messages: [ILL_PROMPT, {
      role: "user",
      content: image_contents,
    }],
    max_tokens: 1000,
  };

  return await client.chat.completions.create(choice_body);
}

async function choose_ill(paths: string[]) {
  const reply = await get_choice_reply(paths.map((path) => {
    const image = Deno.readFileSync(path);
    const url = `data:image/jpeg;base64,${encode(image)}`;
    return {
      type: "image_url",
      image_url: { url: url, detail: "low" },
    };
  })).catch((e) => {
    error(e);
    return undefined;
  });

  if (reply === undefined) return Math.floor(Math.random() * paths.length);

  const choices: number[] = JSON.parse(reply.choices[0].message.content!);
  log(choices);

  log(reply.usage?.total_tokens);

  return choices[Math.floor(Math.random() * choices.length)];
}

function check_rate_limit(group_id: number) {
  const now = new Date();
  if (!(group_id in context)) context[group_id] = [];
  const times = context[group_id];
  while (times.length > 0 && times[0] < now.getTime() - 3600 * 1000) {
    times.shift();
  }
  if (times.length >= config.rate_limit_per_hour) return false;
  times.push(now.getTime());
  return true;
}

export async function search_ill_handler(report: Report) {
  if (!is_at_self(report.message)) return;

  const input = unescape_non_cq(remove_cqcode(report.message).trim());
  if (!config.ill_input_match.some((m) => input.includes(m))) return;

  log("search_ill");
  if (!check_rate_limit(report.group_id)) {
    send_group_at_message(
      report.group_id,
      `Rate limit exceeded, current rate limit is ${config.rate_limit_per_hour} per hour`,
      report.sender.user_id,
    );
    return;
  }

  const ids = await call_function(await get_tag_reply(input), report);
  const pairs = await download_small(ids);
  if (pairs.length == 0) {
    log("No ill found");
    send_group_at_message(
      report.group_id,
      "再怎么找也找不到啦>_<",
      report.sender.user_id,
    );
    return;
  }

  log(pairs);
  const choice = await choose_ill(pairs.map(([_, path]) => path));
  let url = "";
  pairs.forEach(([id, path], index) => {
    Deno.removeSync(path);
    if (index == choice) {
      url = `https://www.pixiv.net/artworks/${id}`;
      log("choice: ", url);
    }
  });

  const [[_, path]] = await download_large([ids[choice]]);
  send_group_at_message(
    report.group_id,
    [cq_image(Deno.readFileSync(path)), url].join("\n"),
    report.sender.user_id,
  );
}

const PREFIX = "./handlers/search_ill";
const SEARCH_ILL_PY = `${PREFIX}/search_ill.py`;

const SEARCH_ILL = PROMPTS.search_ill as ChatCompletionTool;
const TAG_PROMPT = PROMPTS.tag_prompt as ChatCompletionMessageParam;
const ILL_PROMPT = PROMPTS.ill_prompt as ChatCompletionMessageParam;

const context = new Context();

let client: OpenAI;

function on_config_change() {
  base_config_change();
  Deno.env.set("PIXIV_REFRESH_TOKEN", config.pixiv_refresh_token);
  client = new OpenAI({ apiKey: config.openai_api_key });
}

export default {
  name: "search_ill",
  handle_func: wrap(search_ill_handler).with(task_queue).call,
  on_config_change,
};
