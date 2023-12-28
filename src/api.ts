import * as base from "./handlers/base.ts";
import { is_decimal_number } from "./utils.ts";
import { get_config } from "./config.ts";

function ok() {
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

function not_found() {
  return new Response(JSON.stringify({ success: false }), {
    headers: { "Content-Type": "application/json" },
    status: 404,
  });
}

function get_handlers() {
  return new Response(
    JSON.stringify({
      success: true,
      data: base.get_handlers(),
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

function enable_handler(args: Record<string, string>) {
  return base.enable_handler(args["name"]) ? ok() : not_found();
}

function disable_handler(args: Record<string, string>) {
  return base.disable_handler(args["name"]) ? ok() : not_found();
}

function get_groups() {
  return new Response(
    JSON.stringify({
      success: true,
      data: base.get_groups(),
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

function get_handler_groups(args: Record<string, string>) {
  const groups = base.get_handler_groups(args["name"]);
  if (groups === null) {
    return not_found();
  } else {
    return new Response(
      JSON.stringify({
        success: true,
        data: groups,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }
}

function add_group(args: Record<string, string>) {
  if (is_decimal_number(args["group"])) {
    return base.add_group_to_handler(args["name"], Number(args["group"]))
      ? ok()
      : not_found();
  } else {
    return new Response("Invalid group, expected integer", { status: 400 });
  }
}

function remove_group(args: Record<string, string>) {
  if (is_decimal_number(args["group"])) {
    return base.remove_group_from_handler(args["name"], Number(args["group"]))
      ? ok()
      : not_found();
  } else {
    return new Response("Invalid group, expected integer", { status: 400 });
  }
}

function require_args(
  args: string[],
  handler: (args: Record<string, string>) => Response,
) {
  return (request: Request) => {
    const url = new URL(request.url);
    const missing = args.filter((arg) => !url.searchParams.has(arg));
    if (missing.length > 0) {
      return new Response(`Missing arguments: ${missing.join(", ")}`, {
        status: 400,
      });
    }
    const params: Record<string, string> = {};
    for (const arg of args) {
      params[arg] = url.searchParams.get(arg)!;
    }
    return handler(params);
  };
}

function require_auth(handler: (request: Request) => Response) {
  return (request: Request) => {
    const token = new URL(request.url).searchParams.get("token");
    return (token !== get_config().api_token)
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
      return with_cors(
        require_auth(require_args(["name"], enable_handler)),
      )(request);
    case "/api/disable_handler":
      return with_cors(
        require_auth(require_args(["name"], disable_handler)),
      )(request);
    case "/api/auth":
      return with_cors(require_auth(ok))(request);
    case "/api/get_groups":
      return with_cors(require_auth(get_groups))(request);
    case "/api/get_handler_groups":
      return with_cors(
        require_auth(require_args(["name"], get_handler_groups)),
      )(request);
    case "/api/add_group":
      return with_cors(
        require_auth(require_args(["name", "group"], add_group)),
      )(request);
    case "/api/remove_group":
      return with_cors(
        require_auth(require_args(["name", "group"], remove_group)),
      )(request);
    default:
      return with_cors(not_found)(request);
  }
}
