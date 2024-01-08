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
    id: `${number}`;
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
  | JsonSegment;

export type Message = Segment[] | string;
