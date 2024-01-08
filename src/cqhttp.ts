import { get_config } from "./config.ts";
import { sleep } from "https://deno.land/x/sleep@v1.2.1/mod.ts";
import { error, warn } from "./utils.ts";
import { encode } from "https://deno.land/std@0.202.0/encoding/base64.ts";
import { wsApi } from "./main.ts";
import { WebSocketClient } from "https://deno.land/x/websocket@v0.1.4/mod.ts";

export interface Report {
  post_type: string;
  message_type: string;
  sub_type: string;
  group_id: number;
  message: string;
  sender: {
    user_id: number;
    nickname: string;
    card: string;
  };
}

export const cq_image = (data: Uint8Array) =>
  `[CQ:image,file=base64://${encode(data)}]`;

export const cq_at = (at: number) => `[CQ:at,qq=${at}]`;

export const remove_cqcode = (text: string) =>
  text.replaceAll(/\[CQ:[^\]]+\]/g, "");

export const unescape_non_cq = (text: string) =>
  text
    .replaceAll(/&#91;/g, "[")
    .replaceAll(/&#93;/g, "]")
    .replaceAll(/&amp;/g, "&");

export const is_at_self = (text: string) =>
  text.includes(`[CQ:at,qq=${get_config().self_id}]`);

const get_api_body = <TParams>(
  endpoint: string,
  params: TParams,
  echo?: string,
) => JSON.stringify({ action: endpoint, params: params, echo });

const http_api_call = async <TParams>(
  endpoint: string,
  params: TParams,
) => {
  const { http_addr, retry_interval, max_retry } = get_config();

  for (let i = 0; i < max_retry + 1; i++) {
    try {
      const data = await fetch(http_addr, {
        method: "POST",
        headers: new Headers({ "Content-Type": "application/json" }),
        body: get_api_body(endpoint, params),
      }).then((resp) => resp.json());
      if (data.status !== "failed") return true;

      warn(`http api call to ${endpoint} failed: ${data}`);
      warn(`retry in ${retry_interval} seconds`);
      await sleep(retry_interval);
    } catch (e) {
      warn(`http api call to ${endpoint} failed: ${e}`);
      warn(`retry in ${retry_interval} seconds`);
      await sleep(retry_interval);
    }
  }

  error(`failed to call http api ${endpoint} after ${max_retry} retries`);
  return false;
};

const ws_fetch = (ws: WebSocketClient, msg: string, echo: string) =>
  new Promise<{ status: string }>((resolve) => {
    const listener = (msg: string) => {
      const data = JSON.parse(msg);
      if (data.echo == echo) {
        ws.off("message", listener);
        resolve(data);
      }
    };
    ws.on("message", listener).send(msg);
  });

const ws_api_call = async <TParams>(
  endpoint: string,
  params: TParams,
  ws: WebSocketClient,
) => {
  const { retry_interval, max_retry } = get_config();

  for (let i = 0; i < max_retry + 1; i++) {
    try {
      const echo = crypto.randomUUID();
      const msg = get_api_body(endpoint, params, echo);
      const data = await ws_fetch(ws, msg, echo);
      if (data.status !== "failed") return true;

      warn(`ws api call to ${endpoint} failed: ${data}`);
      warn(`retry in ${retry_interval} seconds`);
      await sleep(retry_interval);
    } catch (e) {
      warn(`ws api call to ${endpoint} failed: ${e}`);
      warn(`retry in ${retry_interval} seconds`);
      await sleep(retry_interval);
    }
  }

  error(`failed to call ws api ${endpoint} after ${max_retry} retries`);
  return false;
};

const api_call = <TParams>(
  endpoint: string,
  params: TParams,
) =>
  wsApi
    ? ws_api_call(endpoint, params, wsApi)
    : http_api_call(endpoint, params);

export const send_group_message = (
  group_id: number,
  message: string,
  parse_cq: boolean,
) => api_call("send_group_msg", { group_id, message, auto_escape: !parse_cq });

export const send_group_at_message = (
  group_id: number,
  message: string,
  at: number,
) => send_group_message(group_id, cq_at(at) + message, true);
