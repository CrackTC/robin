import { error, log } from "../utils.ts";

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

export interface ReportHandler {
  (report: Report): Promise<void>;
}

const report_handlers: [ReportHandler, boolean][] = [];

export function handle_report(report: Report) {
  report_handlers.forEach(([handler, enabled]) => {
    if (enabled) {
      handler(report).catch((e) =>
        error(`Error in handler ${handler.name}: ${e}`)
      );
    }
  });
}

export function register_report_handler(handler: ReportHandler) {
  report_handlers.push([handler, true]);
}

export function disable_report_handler(handler_name: string) {
  const index = report_handlers.findIndex((item) =>
    item[0].name === handler_name
  );

  if (index !== -1) {
    report_handlers[index][1] = false;
    return true;
  }
  return false;
}

export function enable_report_handler(handler_name: string) {
  const index = report_handlers.findIndex((item) =>
    item[0].name === handler_name
  );

  if (index !== -1) {
    report_handlers[index][1] = true;
    return true;
  }
  return false;
}

export function get_report_handlers() {
  return report_handlers.map((item) => ({
    name: item[0].name,
    enabled: item[1],
  }));
}

for (const dirEntry of Deno.readDirSync("./handlers")) {
  if (dirEntry.isDirectory) {
    import(
      `./${dirEntry.name}/${dirEntry.name}.ts`
    ).catch(error).then((_) => {
      log(`Loaded handler ${dirEntry.name}`);
    });
  }
}
