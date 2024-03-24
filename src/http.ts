import { api_handler } from "./api/index.ts";
import { get_config } from "./config.ts";
import { handle_event } from "./handlers/index.ts";
import { log } from "./utils.ts";

const http_request_handler = async (request: Request) => {
  if (new URL(request.url).pathname.startsWith("/api")) {
    return api_handler(request);
  } else if (request.method != "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  handle_event(await request.json());

  // https://docs.go-cqhttp.org/reference/#快速操作
  return new Response(null, { status: 204 });
};

export const setup_http = () => {
  const { port } = get_config();
  Deno.serve({ port }, http_request_handler);
  log(`HTTP server started on port ${port}`);
};
