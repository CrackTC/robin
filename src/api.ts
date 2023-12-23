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

function with_cors(handler: (request: Request) => Response) {
  return (request: Request) => {
    const response = handler(request);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  };
}

export function api_handler(request: Request) {
  const { pathname } = new URL(request.url);
  switch (pathname) {
    case "/api/get_handlers":
      return with_cors(get_handlers)(request);
    case "/api/enable_handler":
      return with_cors(require_auth(enable_handler))(request);
    case "/api/disable_handler":
      return with_cors(require_auth(disable_handler))(request);
    case "/api/auth":
      return with_cors(require_auth(ok))(request);
    default:
      return with_cors(not_found)(request);
  }
}

let API_TOKEN = Deno.env.get("API_TOKEN") ?? "";
if (API_TOKEN === "") {
  API_TOKEN = crypto.randomUUID();
  warn(`API_TOKEN not set, using ${API_TOKEN}`);
}
