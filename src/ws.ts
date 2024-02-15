import { sleep } from "https://deno.land/x/sleep@v1.2.1/sleep.ts";
import { get_config } from "./config.ts";
import { handle_event } from "./handlers/index.ts";
import { Event } from "./onebot/types/event/common.ts";
import { error, log } from "./utils.ts";

export let WS_EVENT: WebSocket;
export let WS_API: WebSocket;

const on_message = (msg: MessageEvent) => {
  const event: Event = JSON.parse(msg.data);
  handle_event(event);
};

export const setup_ws_event = () => {
  if (WS_EVENT) WS_EVENT.removeEventListener("message", on_message);

  const event_url = `${get_config().ws_addr}/event`;

  WS_EVENT = new WebSocket(event_url);
  WS_EVENT.addEventListener("open", () => {
    log(`event ws ${event_url} connected`);
  });
  WS_EVENT.addEventListener("message", on_message);
  WS_EVENT.addEventListener("error", (e) => {
    error("event ws error:", e);
  });
  WS_EVENT.addEventListener("close", async () => {
    error("event ws closed");
    await sleep(get_config().retry_interval);
    setup_ws_event();
  });
};

export const setup_ws_api = () => {
  const api_url = `${get_config().ws_addr}/api`;

  WS_API = new WebSocket(api_url);
  WS_API.addEventListener("open", () => {
    log(`api ws ${api_url} connected`);
  });
  WS_API.addEventListener("error", (e) => {
    error("api ws error:", e);
  });
  WS_API.addEventListener("close", async () => {
    error("api ws closed");
    await sleep(get_config().retry_interval);
    setup_ws_api();
  });
};
