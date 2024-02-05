import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { ChatBotClient, ChatBotMessage } from "./common.ts";

export class GeminiChatBotClient implements ChatBotClient {
  private client: GoogleGenerativeAI;
  constructor(api_key: string) {
    this.client = new GoogleGenerativeAI(api_key);
  }
  async get_reply(model: string, messages: ChatBotMessage[]) {
    const last_message = messages.pop()!.content;
    const history = messages.map((message) => {
      const role = message.role === "assistant" ? "model" : "user";
      return { role, parts: message.content };
    });

    const res = await this.client.getGenerativeModel({ model })
      .startChat({ history })
      .sendMessage(last_message);

    return res.response.text();
  }
}
