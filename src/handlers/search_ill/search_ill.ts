import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { encode } from "https://deno.land/std@0.202.0/encoding/base64.ts";
import { error, log, spawn_get_output } from "../../utils.ts";
import { register_report_handler, Report } from "../base.ts";
import { CONFIG } from "../../config.ts";
import PROMPTS from "./prompts.json" with { type: "json" };

import {
  ChatCompletion,
  ChatCompletionContentPart,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "https://deno.land/x/openai@v4.24.0/resources/mod.ts";

import {
  cq_image,
  remove_cqcode,
  send_group_at_message,
} from "../../cqhttp.ts";

class Context {
  [group_id: number]: {
    times: number[];
  };

  constructor() {
    CONFIG.groups.forEach((group_id) => {
      this[group_id] = { times: [] };
    });
  }
}

async function search_ill(tags: string[], report: Report) {
  send_group_at_message(
    report.group_id,
    `using tags: [ ${tags} ]`,
    report.sender.user_id,
  );
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
    send_group_at_message(
      report.group_id,
      `no illust found, using tags [ ${tags} ]`,
      report.sender.user_id,
    );
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
  const tag_reply = await CLIENT.chat.completions.create({
    model: MODEL_TAG,
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
    model: MODEL_ILL,
    messages: [ILL_PROMPT, {
      role: "user",
      content: image_contents,
    }],
    max_tokens: 1000,
  };

  return await CLIENT.chat.completions.create(choice_body);
}

async function choose_ill(paths: string[]) {
  const reply = await get_choice_reply(paths.map((path) => {
    const image = Deno.readFileSync(path);
    const url = `data:image/jpeg;base64,${encode(image)}`;
    return {
      type: "image_url",
      image_url: { url: url, detail: "low" },
    };
  }));

  const choices: number[] = JSON.parse(reply.choices[0].message.content!);
  log(choices);

  log(reply.usage?.total_tokens);

  return choices[Math.floor(Math.random() * choices.length)] - 1;
}

function check_rate_limit(group_id: number) {
  const now = new Date();
  const times = CONTEXT[group_id].times;
  while (times.length > 0 && times[0] < now.getTime() - 3600 * 1000) {
    times.shift();
  }
  if (times.length >= RATE_LIMIT_PER_HOUR) return false;
  times.push(now.getTime());
  return true;
}

export async function search_ill_handler(report: Report) {
  const input = remove_cqcode(report.message).trim();
  if (INPUT_MATCH.some((m) => input.includes(m))) {
    log("search_ill");

    if (!check_rate_limit(report.group_id)) {
      send_group_at_message(
        report.group_id,
        `Rate limit exceeded, current rate limit is ${RATE_LIMIT_PER_HOUR} per hour`,
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
}

const INPUT_MATCH = Deno.env.get("ILL_INPUT_MATCH")?.split(",") || [];
const RATE_LIMIT_PER_HOUR = Number(Deno.env.get("ILL_RATE_LIMIT_PER_HOUR")) ??
  10;

const MODEL_TAG = "gpt-4-1106-preview";
const MODEL_ILL = "gpt-4-vision-preview";

const API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

const CLIENT = new OpenAI({ apiKey: API_KEY });

const PREFIX = "./handlers/search_ill";
const SEARCH_ILL_PY = `${PREFIX}/search_ill.py`;

const SEARCH_ILL = PROMPTS.search_ill as ChatCompletionTool;
const TAG_PROMPT = PROMPTS.tag_prompt as ChatCompletionMessageParam;
const ILL_PROMPT = PROMPTS.ill_prompt as ChatCompletionMessageParam;

const CONTEXT = new Context();

register_report_handler(search_ill_handler);
