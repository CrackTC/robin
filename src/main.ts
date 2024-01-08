import {
  StandardWebSocketClient,
  WebSocketClient,
} from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import { sleep } from "https://deno.land/x/sleep@v1.2.1/mod.ts";
import { api_handler, load_api } from "./api/api.ts";
import { handle_group_msg_event, load_handlers } from "./handlers/base.ts";
import { get_config } from "./config.ts";
import { error, log } from "./utils.ts";
import { is_group_message_event } from "./onebot/cqhttp.ts";
import { Event } from "./onebot/types/event/common.ts";
import { GroupMessageEvent } from "./onebot/types/event/message.ts";

const handle_event = (event: Event) => {
  if (is_group_message_event(event)) {
    log(`group message event: ${JSON.stringify(event)}`);
    const group_msg_event = event as GroupMessageEvent;
    if (get_config().groups.includes(group_msg_event.group_id)) {
      handle_group_msg_event(group_msg_event);
    }
  }
};

const http_request_handler = async (request: Request) => {
  if (new URL(request.url).pathname.startsWith("/api")) {
    return api_handler(request);
  } else if (request.method != "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  handle_event(await request.json());

  // https://docs.go-cqhttp.org/reference/#快速操作
  return new Response(null, { status: 204 });
};

const { port, ws_addr, retry_interval } = get_config();

let wsEvent: WebSocketClient;
export let wsApi: WebSocketClient;

const setup_ws_event = () => {
  const event_url = `${ws_addr}/event`;
  wsEvent = new StandardWebSocketClient(event_url);
  wsEvent
    .on("open", () => {
      log(`event ws ${event_url} connected`);
    })
    .on("message", (msg: MessageEvent) => {
      handle_event(JSON.parse(msg.data));
    })
    .on("error", (e) => {
      error(`event ws error: ${e}`);
    })
    .on("close", async () => {
      error("event ws closed");
      await sleep(retry_interval);
      setup_ws_event();
    });
};

const setup_ws_api = () => {
  const api_url = `${ws_addr}/api`;
  wsApi = new StandardWebSocketClient(api_url);
  wsApi
    .on("open", () => {
      log(`api ws ${api_url} connected`);
    })
    .on("error", (e) => {
      error(`api ws error: ${e}`);
    })
    .on("close", async () => {
      error("api ws closed");
      await sleep(retry_interval);
      setup_ws_api();
    });
};

load_handlers().then(load_api).then(() => {
  if (ws_addr) {
    setup_ws_event();
    setup_ws_api();
  }

  Deno.serve({ port }, http_request_handler);
  log(`HTTP server started on port ${port}`);
});
