import { load_api } from "./api/api.ts";
import { load_handlers } from "./handlers/index.ts";
import { get_config } from "./config.ts";
import { setup_ws_api, setup_ws_event } from "./ws.ts";
import { setup_http } from "./http.ts";

load_handlers().then(load_api).then(() => {
  if (get_config().ws_addr) {
    setup_ws_event();
    setup_ws_api();
  }
  setup_http();
});
