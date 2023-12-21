export interface Report {
  post_type: string;
  message_type: string;
  sub_type: string;
  group_id: number;
  message: string;
  sender: {
    user_id: number;
    nickname: string;
    card: string;
  };
}

export interface ReportHandler {
  (report: Report): Promise<void>;
}
