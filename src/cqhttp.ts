import { get_config } from "./config.ts";
import { sleep } from "https://deno.land/x/sleep@v1.2.1/mod.ts";
import { error, warn } from "./utils.ts";
import { encode } from "https://deno.land/std@0.202.0/encoding/base64.ts";

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

const is_failed = async (response: Response) =>
  (await response.json()).status == "failed";

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

export const send_group_message = async (
  group_id: number,
  message: string,
  parse_cq: boolean,
) => {
  const url = get_config().api_addr + "/send_group_msg";

  const method = "POST";
  const headers = new Headers({ "Content-Type": "application/json" });
  const body = JSON.stringify({ group_id, message, auto_escape: !parse_cq });
  const params = { method, headers, body };

  const interval = get_config().retry_interval;

  for (let i = 0; i < get_config().max_retry + 1; i++) {
    try {
      const response = await fetch(url, params);
      if (await is_failed(response.clone())) {
        warn(
          `send message failed: ${await response.text()}` +
            `retry in ${interval} seconds`,
        );
        await sleep(interval);
      } else {
        return true;
      }
    } catch (e) {
      warn(
        `send message failed: ${e}` +
          `retry in ${interval} seconds`,
      );
      await sleep(interval);
    }
  }

  error(
    `failed to send message to group ${group_id} after ${get_config().max_retry} retries`,
  );
  return false;
};

export const send_group_at_message = (
  group_id: number,
  message: string,
  at: number,
) => send_group_message(group_id, cq_at(at) + message, true);
