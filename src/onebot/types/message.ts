export type TextSegment = {
  type: "text";
  data: {
    text: string;
  };
};

export type FaceSegment = {
  type: "face";
  data: {
    id: string;
  };
};

export type ImageSegment = {
  type: "image";
  data: {
    file: string;
    type?: "flash";
    url?: string;
    cache?: 0 | 1;
    proxy?: 0 | 1;
    timeout?: number;
  };
};

export type RecordSegment = {
  type: "record";
  data: {
    file: string;
    magic?: 0 | 1;
    url?: string;
    cache?: 0 | 1;
    proxy?: 0 | 1;
    timeout?: number;
  };
};

export type VideoSegment = {
  type: "video";
  data: {
    file: string;
    url?: string;
    cache?: 0 | 1;
    proxy?: 0 | 1;
    timeout?: number;
  };
};

export type AtSegment = {
  type: "at";
  data: {
    qq: `${number}` | "all";
  };
};

export type EmptyObject = Record<string | number | symbol, never>;

export type RPSSegment = {
  type: "rps";
  data: EmptyObject;
};

export type DiceSegment = {
  type: "dice";
  data: EmptyObject;
};

export type ShakeSegment = {
  type: "shake";
  data: EmptyObject;
};

export type PokeSegment = {
  type: "poke";
  data: {
    type: string;
    id: string;
    name: string;
  };
};

export type AnonymousSegment = {
  type: "anonymous";
  data: {
    ignore?: 0 | 1;
  };
};

export type ShareSegment = {
  type: "share";
  data: {
    url: string;
    title: string;
    content?: string;
    image?: string;
  };
};

export type ContactSegment = {
  type: "contact";
  data: {
    type: "qq" | "group";
    id: `${number}`;
  };
};

export type LocationSegment = {
  type: "location";
  data: {
    lat: number;
    lon: number;
    title?: string;
    content?: string;
  };
};

export type MusicSegment = {
  type: "music";
  data: {
    type: "qq" | "163" | "xm";
    id: `${number}`;
  };
};

export type CustomMusicSegment = {
  type: "music";
  data: {
    type: "custom";
    url: string;
    audio: string;
    title: string;
    content?: string;
    image?: string;
  };
};

export type ReplySegment = {
  type: "reply";
  data: {
    id: `${number}`;
  };
};

export type ForwardSegment = {
  type: "forward";
  data: {
    id: string;
  };
};

export type NodeSegment = {
  type: "node";
  data: {
    id: `${number}`;
  };
};

export type CustomNodeSegment = {
  type: "node";
  data: {
    user_id: `${number}`;
    nickname: string;
    content: Message;
  };
};

export type XmlSegment = {
  type: "xml";
  data: {
    data: string;
  };
};

export type JsonSegment = {
  type: "json";
  data: {
    data: string;
  };
};

export type MarkdownSegment = {
  type: "markdown";
  data: {
    content: string;
  };
};

export enum KeyboardButtonStyle {
  Gray = 0,
  Blue = 1,
}

export enum KeyboardActionType {
  Jump = 0,
  Callback = 1,
  Command = 2,
}

export enum KeyboardPermissionType {
  SpecifyUser = 0,
  Admin = 1,
  Everyone = 2,
  SpecifyRole = 3,
}

export type KeyboardButton = {
  id?: string;
  render_data: {
    label: string;
    visited_label: string;
    style: KeyboardButtonStyle;
  };
  action: {
    type: KeyboardActionType;
    permission: {
      type: KeyboardPermissionType;
      specify_role_ids?: string[];
      specify_user_ids?: string[];
    };
    unsupport_tips: string;
    data: string;
    reply?: boolean;
    enter?: boolean;
  };
};

export type KeyboardRow = {
  buttons: KeyboardButton[];
};

export type KeyboardSegment = {
  type: "keyboard";
  data: {
    content: KeyboardRow[];
  };
};

export type LongMsgSegment = {
  type: "longmsg";
  data: {
    id: string;
  };
};

export type Segment =
  | TextSegment
  | FaceSegment
  | ImageSegment
  | RecordSegment
  | VideoSegment
  | AtSegment
  | RPSSegment
  | DiceSegment
  | ShakeSegment
  | PokeSegment
  | AnonymousSegment
  | ShareSegment
  | ContactSegment
  | LocationSegment
  | MusicSegment
  | CustomMusicSegment
  | ReplySegment
  | ForwardSegment
  | NodeSegment
  | CustomNodeSegment
  | XmlSegment
  | JsonSegment
  | KeyboardSegment
  | MarkdownSegment
  | LongMsgSegment;

export type Message = Segment[] | string;
