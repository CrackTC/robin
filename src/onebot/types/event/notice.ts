export type GroupUploadNoticeEvent = {
  time: number;
  self_id: number;
  post_type: "notice";
  notice_type: "group_upload";
  group_id: number;
  user_id: number;
  file: {
    id: string;
    name: string;
    size: number;
    busid: number;
  };
};

export type GroupAdminNoticeEvent = {
  time: number;
  self_id: number;
  post_type: "notice";
  notice_type: "group_admin";
  sub_type: "set" | "unset";
  group_id: number;
  user_id: number;
};

export type GroupDecreaseNoticeEvent = {
  time: number;
  self_id: number;
  post_type: "notice";
  notice_type: "group_decrease";
  sub_type: "leave" | "kick" | "kick_me";
  group_id: number;
  operator_id: number;
  user_id: number;
};

export type GroupIncreaseNoticeEvent = {
  time: number;
  self_id: number;
  post_type: "notice";
  notice_type: "group_increase";
  sub_type: "approve" | "invite";
  group_id: number;
  operator_id: number;
  user_id: number;
};

export type GroupBanNoticeEvent = {
  time: number;
  self_id: number;
  post_type: "notice";
  notice_type: "group_ban";
  sub_type: "ban" | "lift_ban";
  group_id: number;
  operator_id: number;
  user_id: number;
  duration: number;
};

export type FriendAddNoticeEvent = {
  time: number;
  self_id: number;
  post_type: "notice";
  notice_type: "friend_add";
  user_id: number;
};

export type GroupRecallNoticeEvent = {
  time: number;
  self_id: number;
  post_type: "notice";
  notice_type: "group_recall";
  group_id: number;
  operator_id: number;
  user_id: number;
  message_id: number;
};

export type FriendRecallNoticeEvent = {
  time: number;
  self_id: number;
  post_type: "notice";
  notice_type: "friend_recall";
  user_id: number;
  message_id: number;
};

export type GroupPokeNoticeEvent = {
  time: number;
  self_id: number;
  post_type: "notice";
  notice_type: "notify";
  sub_type: "poke";
  group_id: number;
  user_id: number;
  target_id: number;
};

export type GroupLuckyKingNoticeEvent = {
  time: number;
  self_id: number;
  post_type: "notice";
  notice_type: "notify";
  sub_type: "lucky_king";
  group_id: number;
  user_id: number;
  target_id: number;
};

export type GroupHonorNoticeEvent = {
  time: number;
  self_id: number;
  post_type: "notice";
  notice_type: "notify";
  sub_type: "honor";
  group_id: number;
  honor_type: "talkative" | "performer" | "emotion" | "emotion";
  user_id: number;
};

export type NoticeEvent =
  | GroupUploadNoticeEvent
  | GroupAdminNoticeEvent
  | GroupDecreaseNoticeEvent
  | GroupIncreaseNoticeEvent
  | GroupBanNoticeEvent
  | FriendAddNoticeEvent
  | GroupRecallNoticeEvent
  | FriendRecallNoticeEvent
  | GroupPokeNoticeEvent
  | GroupLuckyKingNoticeEvent
  | GroupHonorNoticeEvent;
