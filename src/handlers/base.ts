import { error, log } from "../utils.ts";
import { get_config } from "../config.ts";
import { Report } from "../cqhttp.ts";

interface ReportHandler {
  name: string;
  handle_func: { (report: Report): Promise<void> | void };
  groups: number[];
  on_config_change: { (): void };
  enabled: boolean;
}

const report_handlers: { [name: string]: ReportHandler } = {};

export const handle_report = (report: Report) =>
  Object.values(report_handlers)
    .filter((handler) =>
      handler.enabled && handler.groups.includes(report.group_id)
    )
    .forEach(async (handler) => {
      try {
        await handler.handle_func(report);
      } catch (e) {
        error(`Error in handler ${handler.name}: ${e}`);
      }
    });

export const disable_handler = (handler_name: string) => {
  if (handler_name in report_handlers) {
    report_handlers[handler_name].enabled = false;
    return true;
  }
  return false;
};

export const enable_handler = (handler_name: string) => {
  if (handler_name in report_handlers) {
    report_handlers[handler_name].enabled = true;
    return true;
  }
  return false;
};

export function get_handlers() {
  return Object.values(report_handlers).map((item) => ({
    name: item.name,
    enabled: item.enabled,
  }));
}

export function add_group_to_handler(
  handler_name: string,
  group_id: number,
) {
  if (handler_name in report_handlers) {
    const groups = report_handlers[handler_name].groups;
    if (!groups.includes(group_id)) {
      groups.push(group_id);
      return true;
    }
  }
  return false;
}

function add_group_to_handlers(group_id: number) {
  Object.values(report_handlers).forEach((handler) => {
    const groups = handler.groups;
    if (!groups.includes(group_id)) groups.push(group_id);
  });
}

export function remove_group_from_handler(
  handler_name: string,
  group_id: number,
) {
  if (handler_name in report_handlers) {
    const groups = report_handlers[handler_name].groups;
    const group_index = groups.indexOf(group_id);
    if (group_index !== -1) {
      groups.splice(group_index, 1);
      return true;
    }
  }
  return false;
}

export function get_handler_groups(handler_name: string) {
  if (handler_name in report_handlers) {
    return report_handlers[handler_name].groups;
  }
  return null;
}

export const get_groups = () => get_config().groups;

export function on_config_change() {
  Object.values(report_handlers).forEach((handler) => {
    handler.on_config_change();
  });
}

export const get_handler_info = (name: string) => report_handlers[name];

export async function load_handlers() {
  for (const dirEntry of Deno.readDirSync("./handlers")) {
    if (dirEntry.isDirectory) {
      const module = await import(`./${dirEntry.name}/index.ts`);
      report_handlers[module.default.name] = {
        name: module.default.name,
        handle_func: module.default.handle_func,
        on_config_change: module.default.on_config_change,
        groups: [],
        enabled: true,
      };

      module.default.on_config_change();
      log(`Loaded handler ${module.default.name}`);
    }
  }
  get_config().groups.forEach(add_group_to_handlers);
}
