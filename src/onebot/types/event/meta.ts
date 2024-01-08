export type LifecycleEvent = {
  time: number;
  self_id: number;
  post_type: "meta_event";
  meta_event_type: "lifecycle";
  sub_type: "enable" | "disable" | "connect";
};

export type HeartbeatEvent = {
  time: number;
  self_id: number;
  post_type: "meta_event";
  meta_event_type: "heartbeat";
  status: {
    good: boolean;
    online: boolean;
  };
  interval: number;
};

export type MetaEvent = LifecycleEvent | HeartbeatEvent;
