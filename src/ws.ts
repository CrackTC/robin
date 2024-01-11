import {
  StandardWebSocketClient,
  WebSocketClient,
} from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import { get_config } from "./config.ts";
import { error, log } from "./utils.ts";
import { sleep } from "https://deno.land/x/sleep@v1.2.1/sleep.ts";
import { handle_event } from "./handlers/base.ts";
import { Event } from "./onebot/types/event/common.ts";
import { HeartbeatEvent } from "./onebot/types/event/meta.ts";
import { is_heartbeat_event } from "./onebot/cqhttp.ts";

export let WS_EVENT: WebSocketClient;
export let WS_API: WebSocketClient;

export const heartbeat = async (event: HeartbeatEvent) => {
  const interval_ms = event.interval;
  let heartbeated = false;
  const listener = (msg: MessageEvent) => {
    const event: Event = JSON.parse(msg.data);
    if (is_heartbeat_event(event)) {
      heartbeated = true;
      WS_EVENT.off("message", listener);
    }
  };

  WS_EVENT.on("message", listener);
  await sleep(interval_ms * 2 / 1000);
  if (!heartbeated) {
    error("heartbeat timeout");
    setup_ws_event();
    setup_ws_api();
  }
};

export const setup_ws_event = () => {
  const event_url = `${get_config().ws_addr}/event`;
  if (WS_EVENT && !WS_EVENT.isClosed) WS_EVENT.closeForce();

  WS_EVENT = new StandardWebSocketClient(event_url);
  WS_EVENT
    .on("open", () => {
      log(`event ws ${event_url} connected`);
    })
    .on("message", (msg: MessageEvent) => {
      const event: Event = JSON.parse(msg.data);
      handle_event(event);
    })
    .on("error", (e) => {
      error(`event ws error: ${e}`);
    })
    .on("close", async () => {
      error("event ws closed");
      await sleep(get_config().retry_interval);
      setup_ws_event();
    });
};

export const setup_ws_api = () => {
  const api_url = `${get_config().ws_addr}/api`;
  if (WS_API && !WS_API.isClosed) WS_API.closeForce();

  WS_API = new StandardWebSocketClient(api_url);
  WS_API
    .on("open", () => {
      log(`api ws ${api_url} connected`);
    })
    .on("error", (e) => {
      error(`api ws error: ${e}`);
    })
    .on("close", async () => {
      error("api ws closed");
      await sleep(get_config().retry_interval);
      setup_ws_api();
    });
};
