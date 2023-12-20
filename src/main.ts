import { CONFIG } from "./config.ts";
import { Report, ReportHandler } from "./handlers/base.ts";
import { user_rank_handler } from "./handlers/user_rank/user_rank.ts";
import { wordcloud_handler } from "./handlers/word_cloud/word_cloud.ts";
import { rand_reply_handler } from "./handlers/rand_reply/rand_reply.ts";

function report_pred(report: Report) {
  return (report.post_type == "message") &&
    report.message_type == "group" &&
    report.sub_type == "normal" && CONFIG.groups.includes(report.group_id ?? 0);
}

async function request_handler(request: Request) {
  const report = await request.json();
  if (report_pred(report)) {
    // log(rawReport);
    report_handlers.forEach((handler) => handler(report));
  }

  // https://docs.go-cqhttp.org/reference/#%E5%BF%AB%E9%80%9F%E6%93%8D%E4%BD%9C
  return new Response(null, { status: 204 });
}

const report_handlers: ReportHandler[] = [
  user_rank_handler,
  wordcloud_handler,
  rand_reply_handler,
];
Deno.serve({ port: CONFIG.port }, request_handler);
