import { get_config } from "./config.ts";
import { sleep } from "https://deno.land/x/sleep@v1.2.1/mod.ts";
import { error, warn } from "./utils.ts";
import { encode } from "https://deno.land/std@0.202.0/encoding/base64.ts";

async function is_failed(response: Response) {
  return (await response.json()).status == "failed";
}

export function cq_image(data: Uint8Array) {
  return `[CQ:image,file=base64://${encode(data)}]`;
}

export function cq_at(at: number) {
  return `[CQ:at,qq=${at}]`;
}

export function remove_cqcode(text: string) {
  return text.replaceAll(/\[CQ:[^\]]+\]/g, "");
}

export function is_at_self(text: string) {
  return text.includes(`[CQ:at,qq=${get_config().self_id}]`);
}

export async function send_group_message(
  group_id: number,
  message: string,
  parse_cq: boolean,
) {
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
}

export function send_group_at_message(
  group_id: number,
  message: string,
  at: number,
) {
  return send_group_message(group_id, cq_at(at) + message, true);
}
