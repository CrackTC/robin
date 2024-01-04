import { add_cors, json_header, wrap } from "../wrappers.ts";
import { fail } from "./common.ts";
import { log } from "../utils.ts";

function mux(path: string[]) {
  const name = path.shift();
  if (name === undefined) return wrap(() => fail());
  const sub_mux = mux_list[name];
  if (sub_mux === undefined) return wrap(() => fail());
  return sub_mux(path);
}

function request2args(request: Request) {
  const url = new URL(request.url);
  const args: Record<string, string> = {};
  for (const [key, value] of url.searchParams) {
    args[key] = value;
  }
  return args;
}

export function api_handler(request: Request) {
  const { pathname } = new URL(request.url);
  return mux(pathname.split("/").filter((x) => x !== "").slice(1))
    .with(add_cors)
    .with(json_header)
    .call(request2args(request));
}

const mux_list: Record<string, typeof mux> = {};

export async function load_api() {
  for (const dirEntry of Deno.readDirSync("./api")) {
    if (dirEntry.isDirectory) {
      await import(`./${dirEntry.name}/index.ts`).then((mux) => {
        mux_list[dirEntry.name] = mux;
        log(`Loaded mux ${dirEntry.name}`);
      }).catch(Error);
    }
  }
}
