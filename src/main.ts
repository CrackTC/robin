import { api_handler } from "./api.ts";
import { CONFIG } from "./config.ts";
import { handle_report, Report } from "./handlers/base.ts";

function report_pred(report: Report) {
  return (report.post_type == "message") &&
    report.message_type == "group" &&
    report.sub_type == "normal" && CONFIG.groups.includes(report.group_id ?? 0);
}

async function request_handler(request: Request) {
  if (new URL(request.url).pathname.startsWith("/api")) {
    return api_handler(request);
  }

  const report = await request.json();
  if (report_pred(report)) {
    handle_report(report);
  }

  // https://docs.go-cqhttp.org/reference/#快速操作
  return new Response(null, { status: 204 });
}

Deno.serve({ port: CONFIG.port }, request_handler);
