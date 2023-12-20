import { encode } from "https://deno.land/std@0.202.0/encoding/base64.ts";

export function image2cqcode(data: Uint8Array) {
  return `[CQ:image,file=base64://${encode(data)}]`;
}

export function remove_cqcode(text: string) {
  return text.replaceAll(/\[CQ:[^\]]+\]/g, "");
}

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
