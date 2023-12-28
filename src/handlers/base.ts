import { error, log } from "../utils.ts";
import { get_config } from "../config.ts";

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

interface ReportHandler {
  handle_func: { (report: Report): Promise<void> };
  groups: number[];
  on_config_change: { (): void };
}

const report_handlers: [ReportHandler, boolean][] = [];

export function handle_report(report: Report) {
  report_handlers.forEach(([handler, enabled]) => {
    if (enabled) {
      handler.handle_func(report).catch((e) =>
        error(`Error in handler ${handler.handle_func.name}: ${e}`)
      );
    }
  });
}

export function register_handler(handler: ReportHandler) {
  report_handlers.push([handler, true]);
}

export function disable_handler(handler_name: string) {
  const index = report_handlers.findIndex((item) =>
    item[0].handle_func.name === handler_name
  );

  if (index !== -1) {
    report_handlers[index][1] = false;
    return true;
  }
  return false;
}

export function enable_handler(handler_name: string) {
  const index = report_handlers.findIndex((item) =>
    item[0].handle_func.name === handler_name
  );

  if (index !== -1) {
    report_handlers[index][1] = true;
    return true;
  }
  return false;
}

export function get_handlers() {
  return report_handlers.map((item) => ({
    name: item[0].handle_func.name,
    enabled: item[1],
  }));
}

export function add_group_to_handler(
  handler_name: string,
  group_id: number,
) {
  const index = report_handlers.findIndex((item) =>
    item[0].handle_func.name === handler_name
  );

  if (index !== -1) {
    const groups = report_handlers[index][0].groups;
    if (!groups.includes(group_id)) {
      groups.push(group_id);
      return true;
    }
  }
  return false;
}

function add_group_to_handlers(group_id: number) {
  report_handlers.forEach((item) => {
    const groups = item[0].groups;
    if (!groups.includes(group_id)) groups.push(group_id);
  });
}

export function remove_group_from_handler(
  handler_name: string,
  group_id: number,
) {
  const index = report_handlers.findIndex((item) =>
    item[0].handle_func.name === handler_name
  );

  if (index !== -1) {
    const groups = report_handlers[index][0].groups;
    const group_index = groups.indexOf(group_id);
    if (group_index !== -1) {
      groups.splice(group_index, 1);
      return true;
    }
  }
  return false;
}

export function get_handler_groups(handler_name: string) {
  const index = report_handlers.findIndex((item) =>
    item[0].handle_func.name === handler_name
  );

  if (index !== -1) {
    return report_handlers[index][0].groups;
  }
  return null;
}

export function get_groups() {
  return get_config().groups;
}

export function on_config_change() {
  report_handlers.forEach((item) => {
    item[0].on_config_change();
  });
}

export async function load_handlers() {
  for (const dirEntry of Deno.readDirSync("./handlers")) {
    if (dirEntry.isDirectory) {
      await import(
        `./${dirEntry.name}/${dirEntry.name}.ts`
      ).catch(error).then((_) => {
        log(`Loaded handler ${dirEntry.name}`);
      });
    }
  }
  get_config().groups.forEach(add_group_to_handlers);
}
