export type ChatBotMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface ChatBotClient {
  get_reply: (
    model: string,
    messages: ChatBotMessage[],
  ) => Promise<string | null>;
}
