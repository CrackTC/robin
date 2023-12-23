import {
  disable_report_handler,
  enable_report_handler,
  get_report_handlers,
} from "./handlers/base.ts";

import { warn } from "./utils.ts";

function ok() {
  return new Response("OK");
}

function not_found() {
  return new Response("Not found", { status: 404 });
}

function get_handlers(_request: Request) {
  return new Response(JSON.stringify(get_report_handlers()), {
    headers: { "Content-Type": "application/json" },
  });
}

function enable_handler(request: Request) {
  const name = new URL(request.url).searchParams.get("name");
  if (name === null) {
    return new Response("Missing name", { status: 400 });
  }

  return enable_report_handler(name) ? ok() : not_found();
}

function disable_handler(request: Request) {
  const name = new URL(request.url).searchParams.get("name");
  if (name === null) {
    return new Response("Missing name", { status: 400 });
  }

  return disable_report_handler(name) ? ok() : not_found();
}

function require_auth(handler: (request: Request) => Response) {
  return (request: Request) => {
    const token = new URL(request.url).searchParams.get("token");
    return (token !== API_TOKEN)
      ? new Response("Unauthorized", { status: 401 })
      : handler(request);
  };
}

export function api_handler(request: Request) {
  const { pathname } = new URL(request.url);
  switch (pathname) {
    case "/api/get_handlers":
      return get_handlers(request);
    case "/api/enable_handler":
      return require_auth(enable_handler)(request);
    case "/api/disable_handler":
      return require_auth(disable_handler)(request);
    case "/api/auth":
      return require_auth(ok)(request);
    default:
      return not_found();
  }
}

let API_TOKEN = Deno.env.get("API_TOKEN") ?? "";
if (API_TOKEN === "") {
  API_TOKEN = crypto.randomUUID();
  warn(`API_TOKEN not set, using ${API_TOKEN}`);
}
