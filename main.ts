import { daily } from "https://deno.land/x/deno_cron@v1.0.0/cron.ts";

const port = 0xc1d;

let userRank: { [index: string]: number } = {};
let messages: string[] = [];

const handler = async (request: Request): Promise<Response> => {
  const json = await request.json();
  if (json.post_type == "message") {
    const nickname: string = json.sender.nickname;
    if (nickname in userRank) userRank[nickname]++;
    else userRank[nickname] = 1;

    const msg_chain: [{ type: string; data: { text: string } }] = json.message;
    msg_chain.forEach((element) => {
      if (element.type == "text") messages.push(element.data.text);
    });
  }
  return new Response(null, { status: 204 });
};

console.log(`HTTP server running. Access it at: http://localhost:${port}/`);
Deno.serve({ port }, handler);

daily(() => {
  let all_msg = messages.join("\n");
  // todo
  userRank = {};
  messages = [];
});
