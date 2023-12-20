import { CONFIG } from "./config.ts";
import { sleep } from "https://deno.land/x/sleep@v1.2.1/mod.ts";
import { error, warn } from "./utils.ts";

async function is_failed(response: Response) {
  return (await response.json()).status == "failed";
}

export async function send_group_message(
  group_id: number,
  message: string,
  parse_cq: boolean,
) {
  const url = CONFIG.api_addr + "/send_group_msg";

  const method = "POST";
  const headers = new Headers({ "Content-Type": "application/json" });
  const body = JSON.stringify({ group_id, message, auto_escape: !parse_cq });
  const params = { method, headers, body };

  const interval = CONFIG.retry_interval;

  for (let i = 0; i < CONFIG.max_retry + 1; i++) {
    try {
      const response = await fetch(url, params);
      if (await is_failed(response)) {
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
    `failed to send message to group ${group_id} after ${CONFIG.max_retry} retries`,
  );
  return false;
}
