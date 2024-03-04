import { import_dir, log } from "/utils.ts";
import { add_cors, json_header, wrap } from "/wrappers.ts";
import { ApiHandler } from "/api/types.ts";
import { fail } from "/api/common.ts";

function mux(path: string[]) {
  const name = path.shift();
  if (name === undefined) return wrap<ApiHandler>(() => fail());
  const sub_mux = mux_list[name];
  if (sub_mux === undefined) return wrap<ApiHandler>(() => fail());
  return sub_mux(path);
}

const request2args = (request: Request) => {
  const url = new URL(request.url);
  const args: Record<string, string> = {};
  for (const [key, value] of url.searchParams) {
    args[key] = value;
  }
  return args;
};

export const api_handler = (request: Request) =>
  mux(new URL(request.url).pathname.split("/").filter((x) => x !== "").slice(1))
    .with(add_cors)
    .with(json_header)
    .call(request2args(request));

const mux_list: Record<string, typeof mux> = {};

export const load_api = async () => {
  for await (const { name, module } of import_dir(import.meta.url)) {
    mux_list[name] = module.default;
    log(`Loaded mux ${name}`);
  }
};
