import { import_dir, log } from "../utils.ts";
import { event_handlers } from "./index.ts";
import { EventHandler } from "./types.ts";

export const load_handlers_from_url = async (category: string, url: string) => {
  for await (const { module } of import_dir(url)) {
    const item: EventHandler = module.default;
    event_handlers[item.name] = item;
    if (item.on_config_change) {
      item.on_config_change(get_config());
      config_events.on("change", item.on_config_change);
    }
    log(`loaded ${category} handler ${item.name}`);
  }
};
