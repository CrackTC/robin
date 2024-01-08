export type FriendRequestEvent = {
  time: number;
  self_id: number;
  post_type: "request";
  request_type: "friend";
  user_id: number;
  comment: string;
  flag: string;
};

export type GroupRequestEvent = {
  time: number;
  self_id: number;
  post_type: "request";
  request_type: "group";
  sub_type: "add" | "invite";
  group_id: number;
  user_id: number;
  comment: string;
  flag: string;
};

export type RequestEvent = FriendRequestEvent | GroupRequestEvent;
