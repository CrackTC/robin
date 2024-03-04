import * as path from "https://deno.land/std@0.212.0/path/mod.ts";
import { sleep } from "https://deno.land/x/sleep@v1.2.1/mod.ts";

export function assert(
  condition: boolean,
  message?: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

export const is_decimal_number = (str: string) => /^\d+$/.test(str);

export const log = (...data: unknown[]) =>
  console.log(
    "%s%s",
    `[${new Date().toLocaleString()}] [INFO] `,
    data.map((item) =>
      typeof item === "string"
        ? item
        : JSON.stringify(item, Object.getOwnPropertyNames(item))
    )
      .join(" "),
  );
export const warn = (...data: unknown[]) =>
  console.warn(
    "%c%s%s",
    "color: yellow",
    `[${new Date().toLocaleString()}] [WARN] `,
    data.map((item) =>
      typeof item === "string"
        ? item
        : JSON.stringify(item, Object.getOwnPropertyNames(item))
    )
      .join(" "),
  );
export const error = (...data: unknown[]) =>
  console.error(
    "%c%s%s",
    "color: red",
    `[${new Date().toLocaleString()}] [ERROR] `,
    data.map((item) =>
      typeof item === "string"
        ? item
        : JSON.stringify(item, Object.getOwnPropertyNames(item))
    )
      .join(" "),
  );

const get_time = () => {
  const date = new Date();
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ].map((num) => num.toString().padStart(2, "0")).join("");
};

const get_backup_name = (name: string) =>
  [get_time(), crypto.randomUUID(), name].join(".");

export const backup = (data: Uint8Array | string, name: string) => {
  const backup_name = get_backup_name(name);
  if (typeof data === "string") Deno.writeTextFileSync(backup_name, data);
  else Deno.writeFileSync(backup_name, data);
  warn(`backup to ${backup_name}`);
};

export const spawn_set_input = async (argv: string[], input: string) => {
  log("spawn", argv);
  const command = new Deno.Command(argv[0], {
    args: argv.slice(1),
    stdin: "piped",
  });

  const process = command.spawn();
  const writer = process.stdin.getWriter();
  await writer.write(new TextEncoder().encode(input));
  writer.releaseLock();
  await process.stdin.close();

  const output = await process.output();
  if (!output.success) {
    error(`spawn ${argv[0]} failed with code ${output.code}`);
  }
};

export const spawn_get_output = async (argv: string[]) => {
  log("spawn", argv);
  const command = new Deno.Command(argv[0], {
    args: argv.slice(1),
    stdout: "piped",
  });

  const output = await command.spawn().output();
  if (output.success) {
    return new TextDecoder().decode(output.stdout);
  } else {
    error(`spawn ${argv[0]} failed with code ${output.code}`);
  }
};

export const heartbeat_start = (interval: number, die: () => void) => {
  let alive = false;

  (async () => {
    await sleep(interval * 2 / 1000);
    if (!alive) {
      error("heartbeat timeout");
      die();
    }
  })();

  return () => {
    alive = true;
  };
};

export const import_dir = async function* (url: string) {
  const dirname = path.join(path.dirname(path.fromFileUrl(url)), "lib");
  for (const { name, isDirectory } of Deno.readDirSync(dirname)) {
    if (isDirectory) {
      yield {
        name,
        module: await import(path.join(dirname, name, "index.ts")),
      };
    }
  }
};
