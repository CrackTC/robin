import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { encode } from "https://deno.land/std@0.202.0/encoding/base64.ts";
import { error, log } from "../../utils.ts";
import { Report } from "../base.ts";

import {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionTool,
} from "https://deno.land/x/openai@v4.24.0/resources/mod.ts";

import {
  cq_image,
  remove_cqcode,
  send_group_at_message,
} from "../../cqhttp.ts";

const MODEL_TAG = "gpt-4-1106-preview";
const MODEL_ILL = "gpt-4-vision-preview";
const API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const client = new OpenAI({ apiKey: API_KEY });

const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_ill",
      description: "Search for illustrations on pixiv based on tags",
      parameters: {
        type: "object",
        properties: {
          tags: {
            type: "array",
            items: {
              type: "string",
            },
            description:
              "Tags to search for, *must* in English or Japanese, for example: ['オリジナル', '女の子', '水着', 'オリジナル1000users入り', '仕事絵']",
          },
        },
        "required": ["tags"],
      },
    },
  },
];

async function call_function(completion: ChatCompletion, report: Report) {
  const fn = completion.choices[0].message.tool_calls![0].function;
  if (fn.name == "search_ill") {
    const args = JSON.parse(fn.arguments);
    if (args.tags.length == 0) {
      return [];
    }
    send_group_at_message(
      report.group_id,
      `using tags ${args.tags}`,
      report.sender.user_id,
    );
    while (args.tags.length > 0) {
      const command_search = new Deno.Command("python3", {
        args: ["./handlers/search_ill/search_ill.py", "search"].concat(
          args.tags,
        ),
        stdout: "piped",
      });
      const child = command_search.spawn();
      const output = await child.output();
      if (!output.success) {
        log("Search failed");
        return [];
      }
      const res: number[] = JSON.parse(
        new TextDecoder().decode(output.stdout),
      );

      if (res.length > 0) return res;
      args.tags.pop();
      send_group_at_message(
        report.group_id,
        `No ill found, using tags ${args.tags}`,
        report.sender.user_id,
      );
    }
  }
  return [];
}

async function download_small(ids: number[]) {
  const command_download = new Deno.Command("python3", {
    args: ["./handlers/search_ill/search_ill.py", "download_small"].concat(
      ids.map((id) => id.toString()),
    ),
    stdout: "piped",
  });

  const child = command_download.spawn();
  const output = await child.output();
  if (!output.success) {
    error("Download failed");
    return [];
  }

  return JSON.parse(new TextDecoder().decode(output.stdout)) as [
    string,
    string,
  ][];
}

async function download_large(ids: number[]) {
  const command_download = new Deno.Command("python3", {
    args: ["./handlers/search_ill/search_ill.py", "download"].concat(
      ids.map((id) => id.toString()),
    ),
    stdout: "piped",
  });

  const child = command_download.spawn();
  const output = await child.output();
  if (!output.success) {
    error("Download failed");
    return [];
  }

  return JSON.parse(new TextDecoder().decode(output.stdout)) as [
    string,
    string,
  ][];
}

async function get_ill(input: string, report: Report) {
  const tag_body: ChatCompletionCreateParamsNonStreaming = {
    model: MODEL_TAG,
    messages: [
      {
        role: "system",
        content:
          "You are an assistant help otakus searching pixiv illustrations. " +
          "Tags must be in English or Japanese and you can use Katakana if necessary, " +
          "For example: ['オリジナル', '女の子', '水着', 'オリジナル1000users入り', '仕事絵']. " +
          "If user don't mean to search for illusts, call function with an empty list",
      },
      {
        role: "user",
        content: input,
      },
    ],
    tools: tools,
    tool_choice: tools[0],
  };
  const tagCompletion = await client.chat.completions.create(tag_body);
  log(tagCompletion);
  log(JSON.stringify(tagCompletion.choices[0].message.tool_calls));

  const ill_body: ChatCompletionCreateParamsNonStreaming = {
    model: MODEL_ILL,
    messages: [
      {
        role: "system",
        content: "User will send you several illustrations from pixiv," +
          "please analyze which one you think would be liked by otakus." +
          "You need not to explain why you choose this one," +
          "just give the number(s) of that illustration in the format of json array (max 2) " +
          "without markdown code fence.",
      },
    ],
    max_tokens: 1000,
  };
  const ids = await call_function(tagCompletion, report);
  const pairs = await download_small(ids);
  log(pairs);
  if (pairs.length == 0) {
    log("No ill found");
    send_group_at_message(
      report.group_id,
      "再怎么找也找不到啦>_<",
      report.sender.user_id,
    );
    return;
  }

  ill_body.messages.push({
    role: "user",
    content: pairs.map(([_, path]) => {
      const img_b64 = encode(Deno.readFileSync(path));
      const url = `data:image/jpeg;base64,${img_b64}`;
      return {
        type: "image_url",
        image_url: {
          url: url,
          detail: "low",
        },
      };
    }),
  });

  const illCompletion = await client.chat.completions.create(ill_body);

  const choices = JSON.parse(illCompletion.choices[0].message.content!);
  log(choices);
  log(illCompletion.usage?.total_tokens);

  const choice = choices[Math.floor(Math.random() * choices.length)];
  pairs.forEach(([id, path], index) => {
    if (index == choice) {
      log(`choice: https://www.pixiv.net/artworks/${id}`);
    }
    Deno.removeSync(path);
  });

  const [[_, path]] = await download_large([ids[choice]]);
  return Deno.readFileSync(path);
}

const INPUT_MATCH = Deno.env.get("ILL_INPUT_MATCH")?.split(",") || [];

export function search_ill_handler(report: Report) {
  const input = remove_cqcode(report.message).trim();
  if (INPUT_MATCH.some((m) => input.includes(m))) {
    log("search_ill");
    get_ill(input, report).then((img) => {
      if (img) {
        send_group_at_message(
          report.group_id,
          cq_image(img),
          report.sender.user_id,
        );
      }
    });
  }
}
