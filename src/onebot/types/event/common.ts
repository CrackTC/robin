import { MessageEvent } from "./message.ts";
import { MetaEvent } from "./meta.ts";
import { NoticeEvent } from "./notice.ts";
import { RequestEvent } from "./request.ts";

export type Event = MessageEvent | MetaEvent | NoticeEvent | RequestEvent;
