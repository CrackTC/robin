import OpenAI from "https://deno.land/x/openai@v4.24.5/mod.ts";
import { ChatBotClient, ChatBotMessage } from "./common.ts";

export class OpenAIChatBotClient implements ChatBotClient {
  private client: OpenAI;
  constructor(api_key: string) {
    this.client = new OpenAI({ apiKey: api_key });
  }
  async get_reply(model: string, messages: ChatBotMessage[]) {
    const res = await this.client.chat.completions.create({ messages, model });
    return res.choices[0].message.content;
  }
}
