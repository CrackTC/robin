import { load_api } from "/api/index.ts";
import { get_config, watch_config } from "/config.ts";
import { load_handlers } from "/handlers/index.ts";
import { setup_http } from "/http.ts";
import { setup_ws_api, setup_ws_event } from "/ws.ts";

(async () => {
  await load_handlers();
  await load_api();
  watch_config();
  if (get_config().ws_addr) {
    setup_ws_event();
    setup_ws_api();
  }
  setup_http();
})();
