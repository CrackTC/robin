import { Message } from "/onebot/types/message.ts";

export type PrivateMessageEvent = {
  time: number;
  self_id: number;
  post_type: "message";
  message_type: "private";
  sub_type: "friend" | "group" | "other";
  message_id: number;
  user_id: number;
  message: Message;
  raw_message: string;
  font: number;
  sender: PrivateSender;
};

export type PrivateSender = {
  user_id: number;
  nickname: string;
  sex: Sex;
  age: number;
};

export type Sex = "male" | "female" | "unknown";

export type GroupMessageEvent = {
  time: number;
  self_id: number;
  post_type: "message";
  message_type: "group";
  sub_type: "normal" | "anonymous" | "notice";
  message_id: number;
  group_id: number;
  user_id: number;
  anonymous: Anonymous;
  message: Message;
  raw_message: string;
  font: number;
  sender: GroupSender;
};

export type Anonymous = {
  id: number;
  name: string;
  flag: string;
};

export type GroupSender = {
  user_id: number;
  nickname: string;
  card: string | null;
  sex: Sex;
  age: number;
  area: string;
  level: string;
  role: "owner" | "admin" | "member";
  title: string;
};

export type Sender = GroupSender | PrivateSender;
export type MessageEvent = PrivateMessageEvent | GroupMessageEvent;
