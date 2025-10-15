import { Tables } from "./database.types";

export type Notification = Tables<"notifications">;

export type NotificationType =
  | "track_request"
  | "daily_note"
  | "revenue_submission"
  | "system";

export interface NotificationMetadata {
  [key: string]: any;
}

export interface TrackRequestNotificationMetadata extends NotificationMetadata {
  requestId: string;
  studentName: string;
  studentEmail: string;
  requestType: string;
}

export interface DailyNoteNotificationMetadata extends NotificationMetadata {
  noteId: string;
  studentName: string;
  studentEmail: string;
  goalTitle: string;
  noteDate: string;
}

export interface RevenueSubmissionNotificationMetadata
  extends NotificationMetadata {
  submissionId: string;
  studentName: string;
  studentEmail: string;
  amount: number;
  goalTitle: string;
}
