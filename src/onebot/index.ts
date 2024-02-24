import { encode } from "https://deno.land/std@0.202.0/encoding/base64.ts";
import { sleep } from "https://deno.land/x/sleep@v1.2.1/mod.ts";
import { get_config } from "../config.ts";
import { error, log, warn } from "../utils.ts";
import { WS_API } from "../ws.ts";
import { Event } from "./types/event/common.ts";
import {
  GroupMessageEvent,
  MessageEvent,
  PrivateMessageEvent,
} from "./types/event/message.ts";
import { HeartbeatEvent } from "./types/event/meta.ts";
import {
  AtSegment,
  ImageSegment,
  Message,
  ReplySegment,
  TextSegment,
} from "./types/message.ts";
import {
  GetGroupMemberInfoResponseData,
  GetGroupMemberListResponseData,
  GetMsgResponseData,
  HttpApiResponse,
  SendGroupMessageResponseData,
  SendPrivateMessageResponseData,
  WsApiResponse,
} from "./types/api.ts";

export const mk_text = (text: string): TextSegment => ({
  type: "text",
  data: {
    text,
  },
});

export const mk_image = (data: Uint8Array): ImageSegment => (
  {
    type: "image",
    data: {
      file: `base64://${encode(data)}`,
    },
  }
);

export const mk_at = (at: number | "all"): AtSegment => ({
  type: "at",
  data: {
    qq: `${at}`,
  },
});

export const mk_reply = (event: MessageEvent): ReplySegment => ({
  type: "reply",
  data: {
    id: `${event.message_id}`,
  },
});

export const is_heartbeat_event = (event: Event): event is HeartbeatEvent =>
  event.post_type == "meta_event" && event.meta_event_type == "heartbeat";

export const is_group_message_event = (
  event: Event,
): event is GroupMessageEvent =>
  event.post_type == "message" &&
  event.message_type == "group" &&
  event.sub_type == "normal";

export const is_private_message_event = (
  event: Event,
): event is PrivateMessageEvent =>
  event.post_type == "message" &&
  event.message_type == "private" &&
  event.sub_type == "friend";

export const is_at_self = (msg: Message) => {
  const self_id = get_config().self_id;
  if (typeof msg === "string") {
    return msg.includes(`[CQ:at,qq=${self_id}]`);
  }

  return msg.some((seg) => seg.type === "at" && seg.data.qq === `${self_id}`);
};

export const get_safe_card = (card: string | null) => {
  if (!card) return;
  if (card.startsWith("\n")) return card.split("\n")[1].split("\t")[1];
  else return card;
};

const get_api_body = <TParams>(
  endpoint: string,
  params: TParams,
  echo?: string,
) => JSON.stringify({ action: endpoint, params: params, echo });

const http_api_call = async <TParams>(
  endpoint: string,
  params: TParams,
): Promise<HttpApiResponse> => {
  const { http_addr, retry_interval, max_retry } = get_config();

  let response: HttpApiResponse;
  for (let i = 0; i < max_retry + 1; i++) {
    try {
      response = await fetch(http_addr, {
        method: "POST",
        headers: new Headers({ "Content-Type": "application/json" }),
        body: get_api_body(endpoint, params),
      }).then((resp) => resp.json());
      if (response.status !== "failed") return response;

      warn(`http api call to ${endpoint} failed: ${response}`);
      warn(`retry in ${retry_interval} seconds`);
      await sleep(retry_interval);
    } catch (e) {
      warn(`http api call to ${endpoint} failed: ${e}`);
      warn(`retry in ${retry_interval} seconds`);
      await sleep(retry_interval);
    }
  }

  error(`failed to call http api ${endpoint} after ${max_retry} retries`);
  return response!;
};

const ws_fetch = (ws: WebSocket, msg: string, echo: string) =>
  new Promise<WsApiResponse>((resolve) => {
    const listener = (msg: { data: string }) => {
      const data = JSON.parse(msg.data);
      if (data.echo == echo) {
        ws.removeEventListener("message", listener);
        resolve(data);
      }
    };
    ws.addEventListener("message", listener);
    ws.send(msg);
  });

const ws_api_call = async <TParams>(
  endpoint: string,
  params: TParams,
  ws: WebSocket,
): Promise<WsApiResponse> => {
  const { retry_interval, max_retry } = get_config();

  let response: WsApiResponse;
  for (let i = 0; i < max_retry + 1; i++) {
    try {
      const echo = crypto.randomUUID();
      const msg = get_api_body(endpoint, params, echo);
      response = await ws_fetch(ws, msg, echo);
      if (response.status !== "failed") return response;

      warn(`ws api call to ${endpoint} failed: ${response}`);
      warn(`retry in ${retry_interval} seconds`);
      await sleep(retry_interval);
    } catch (e) {
      warn(`ws api call to ${endpoint} failed: ${e}`);
      warn(`retry in ${retry_interval} seconds`);
      await sleep(retry_interval);
    }
  }

  error(`failed to call ws api ${endpoint} after ${max_retry} retries`);
  return response!;
};

const api_call = async <TParams>(
  endpoint: string,
  params: TParams,
) => {
  log(`calling api ${endpoint}, params: ${JSON.stringify(params)}`);
  return WS_API
    ? (await ws_api_call(endpoint, params, WS_API)).data
    : (await (http_api_call(endpoint, params))).data;
};

export const send_group_message = async (
  group_id: number,
  message: Message,
  parse_cq = false,
) =>
  (await api_call("send_group_msg", {
    group_id,
    message,
    auto_escape: !parse_cq,
  })) as SendGroupMessageResponseData;

export const send_private_message = async (
  user_id: number,
  message: Message,
  parse_cq = false,
) =>
  (await api_call("send_private_msg", {
    user_id,
    message,
    auto_escape: !parse_cq,
  })) as SendPrivateMessageResponseData;

export const get_group_member_list = async (
  group_id: number,
) =>
  (await api_call("get_group_member_list", {
    group_id,
  })) as GetGroupMemberListResponseData;

export const get_group_member_info = async (
  group_id: number,
  user_id: number,
  no_cache = false,
) =>
  (await api_call("get_group_member_info", {
    group_id,
    user_id,
    no_cache,
  })) as GetGroupMemberInfoResponseData;

export const get_msg = async (
  message_id: number,
) => (await api_call("get_msg", { message_id })) as GetMsgResponseData;
