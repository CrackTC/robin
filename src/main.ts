import {
  StandardWebSocketClient,
  WebSocketClient,
} from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import { sleep } from "https://deno.land/x/sleep@v1.2.1/mod.ts";
import { api_handler, load_api } from "./api/api.ts";
import { handle_report, load_handlers } from "./handlers/base.ts";
import { Report } from "./cqhttp.ts";
import { get_config } from "./config.ts";
import { error, log } from "./utils.ts";

const report_pred = (report: Report) =>
  report.post_type == "message" &&
  report.message_type == "group" &&
  report.sub_type == "normal" &&
  get_config().groups.includes(report.group_id ?? 0);

const http_request_handler = async (request: Request) => {
  if (new URL(request.url).pathname.startsWith("/api")) {
    return api_handler(request);
  } else if (request.method != "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const report = await request.json();
  if (report_pred(report)) handle_report(report);

  // https://docs.go-cqhttp.org/reference/#快速操作
  return new Response(null, { status: 204 });
};

const { port, ws_addr, retry_interval } = get_config();
await load_handlers();

await load_api();
Deno.serve({ port }, http_request_handler);
log(`HTTP listening on port ${port}`);

let wsEvent: WebSocketClient;
export let wsApi: WebSocketClient;

const setup_ws_event = () => {
  const event_url = `${ws_addr}/event`;
  wsEvent = new StandardWebSocketClient(event_url);
  wsEvent.on("open", () => {
    log(`event ws ${event_url} connected`);
  }).on("message", (msg) => {
    const report = JSON.parse(msg);
    if (report_pred(report)) handle_report(report);
  }).on("error", (e) => {
    error(`event ws error: ${e}`);
  }).on("close", async () => {
    error("event ws closed");
    await sleep(retry_interval);
    setup_ws_event();
  });
};

const setup_ws_api = () => {
  const api_url = `${ws_addr}/api`;
  wsApi = new StandardWebSocketClient(api_url);
  wsApi.on("open", () => {
    log(`api ws ${api_url} connected`);
  }).on("error", (e) => {
    error(`api ws error: ${e}`);
  }).on("close", async () => {
    error("api ws closed");
    await sleep(retry_interval);
    setup_ws_api();
  });
};

if (ws_addr) {
  setup_ws_event();
  setup_ws_api();
}
