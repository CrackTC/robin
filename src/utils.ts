export function log(...data: unknown[]) {
  console.log(new Date(), ...data);
}

export function warn(...data: unknown[]) {
  console.warn(new Date(), ...data);
}

export function error(...data: unknown[]) {
  console.error(new Date(), ...data);
}

function get_time() {
  const date = new Date();
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ].map((num) => num.toString().padStart(2, "0")).join("");
}

function get_backup_name(name: string) {
  return [get_time(), crypto.randomUUID(), name].join(".");
}

export function backup(data: Uint8Array | string, name: string) {
  const backup_name = get_backup_name(name);
  if (typeof data === "string") {
    Deno.writeTextFileSync(backup_name, data);
  } else {
    Deno.writeFileSync(backup_name, data);
  }
  warn(`backup to ${backup_name}`);
}

export async function spawn_set_input(argv: string[], input: string) {
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
}

export async function spawn_get_output(argv: string[]) {
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
}
