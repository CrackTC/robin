import { Sender } from "/onebot/types/event/message.ts";
import { Message } from "/onebot/types/message.ts";

export type SendPrivateMsgResponseData = {
  message_id: number;
};

export type SendGroupMsgResponseData = {
  message_id: number;
};

export type GetGroupMemberInfoResponseData = {
  group_id: number;
  user_id: number;
  nickname: string;
  card: string | null;
  sex: "male" | "female" | "unknown";
  age: number;
  area: string;
  join_time: number;
  last_sent_time: number;
  level: string;
  role: "owner" | "admin" | "member";
  unfriendly: boolean;
  title: string;
  title_expire_time: number;
  card_changeable: boolean;
};

export type GetGroupMemberListResponseData = GetGroupMemberInfoResponseData[];

export type GetMsgResponseData = {
  time: number;
  message_type: "private" | "group";
  message_id: number;
  real_id: number;
  sender: Sender;
  message: Message;
};

export type SendForwardMsgResponseData = string;

export type ResponseData =
  | SendPrivateMsgResponseData
  | SendGroupMsgResponseData
  | GetGroupMemberInfoResponseData
  | GetGroupMemberListResponseData
  | GetMsgResponseData
  | SendForwardMsgResponseData;

export type HttpApiResponse = {
  "status": "ok" | "async" | "failed";
  "retcode": number;
  "msg": string | undefined;
  "wording": string | undefined;
  "data": ResponseData;
};

export type WsApiResponse = HttpApiResponse & { echo: string };

export type ApiResponse = HttpApiResponse | WsApiResponse;
