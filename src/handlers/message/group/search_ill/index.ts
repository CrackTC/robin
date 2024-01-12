import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { encode } from "https://deno.land/std@0.202.0/encoding/base64.ts";
import { error, log, spawn_get_output } from "../../../../utils.ts";
import { config, on_config_change as base_config_change } from "./config.ts";
import { rate_limit, task_queue, wrap } from "../../../../wrappers.ts";
import PROMPTS from "./prompts.json" with { type: "json" };

import {
  ChatCompletion,
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "https://deno.land/x/openai@v4.24.0/resources/mod.ts";

import {
  is_at_self,
  mk_image,
  mk_reply,
  mk_text,
  send_group_message,
} from "../../../../onebot/cqhttp.ts";
import { GroupEventHandleFunc, GroupEventHandler } from "../types.ts";
import { GroupMessageEvent } from "../../../../onebot/types/event/message.ts";
import { Message } from "../../../../onebot/types/message.ts";

const search_ill_by_tags = async (tags: string[]) => {
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
  }
};

const call_function = async (completion: ChatCompletion) => {
  if (completion.choices[0].message.tool_calls === undefined) {
    error("No tool calls");
    return [];
  }

  const fn = completion.choices[0].message.tool_calls[0].function;
  switch (fn.name) {
    case "search_ill":
      return await search_ill_by_tags(JSON.parse(fn.arguments).tags);
  }
  return [];
};

const download_small = async (ids: number[]) => {
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
};

const download_large = async (ids: number[]) => {
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
};

const get_tag_reply = (input: string) =>
  client.chat.completions.create({
    model: config.model_tag,
    messages: [TAG_PROMPT, { role: "user", content: input }],
    tools: [SEARCH_ILL],
    tool_choice: SEARCH_ILL,
  });

const get_choice_reply = (image_contents: ChatCompletionContentPart[]) =>
  client.chat.completions.create({
    model: config.model_ill,
    messages: [ILL_PROMPT, { role: "user", content: image_contents }],
    max_tokens: 1000,
  });

async function choose_ill(paths: string[]) {
  const reply = await get_choice_reply(paths.map((path) => {
    const image = Deno.readFileSync(path);
    const url = `data:image/jpeg;base64,${encode(image)}`;
    return { type: "image_url", image_url: { url, detail: "low" } };
  })).catch(error);

  if (reply === undefined) return Math.floor(Math.random() * paths.length);

  const choices: number[] = JSON.parse(reply.choices[0].message.content!);
  log(choices);
  log(reply.usage?.total_tokens);
  return choices[Math.floor(Math.random() * choices.length)];
}

const get_input = (message: Message) => {
  if (!is_at_self(message)) return "";

  let input: string;
  if (typeof message == "string") input = message.trim();
  else {
    input = message.map((seg) =>
      seg.type === "text" ? seg.data.text.trim() : ""
    ).join(" ");
  }
  return config.ill_input_match.some((m) => input.includes(m)) ? input : "";
};

const handle_func = async (event: GroupMessageEvent) => {
  log("search_ill");

  const input = get_input(event.message);
  const ids = await call_function(await get_tag_reply(input));
  const pairs = await download_small(ids);
  if (pairs.length == 0) {
    log("No ill found");
    send_group_message(
      event.group_id,
      [mk_text("再怎么找也找不到啦>_<"), mk_reply(event)],
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
  send_group_message(
    event.group_id,
    [mk_reply(event), mk_image(Deno.readFileSync(path)), mk_text(url)],
  );
};

const PREFIX = "./handlers/search_ill";
const SEARCH_ILL_PY = `${PREFIX}/search_ill.py`;

const SEARCH_ILL = PROMPTS.search_ill as ChatCompletionTool;
const TAG_PROMPT = PROMPTS.tag_prompt as ChatCompletionMessageParam;
const ILL_PROMPT = PROMPTS.ill_prompt as ChatCompletionMessageParam;

let client: OpenAI;

const on_config_change = () => {
  base_config_change();
  Deno.env.set("PIXIV_REFRESH_TOKEN", config.pixiv_refresh_token);
  client = new OpenAI({ apiKey: config.openai_api_key });
};

export default new GroupEventHandler({
  name: "search_ill",
  handle_func: wrap<GroupEventHandleFunc>(handle_func)
    .with(task_queue)
    .with(rate_limit({
      get_limit: () => config.rate_limit_per_hour,
      get_period: () => 3600 * 1000,
      get_id: (event) => event.group_id,
      validate: (event) => get_input(event.message) != "",
      exceed_action: (event, wait) => {
        send_group_message(
          event.group_id,
          [
            mk_reply(event),
            mk_text(`Rate limit exceeded. Please wait ${wait} seconds.`),
          ],
        );
      },
    })).call,
  on_config_change,
});
