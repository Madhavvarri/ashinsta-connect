import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];

export type Profile = Tables["profiles"]["Row"];
export type InstagramAccount = Omit<Tables["instagram_accounts"]["Row"], "access_token">;
export type AutomationRule = Tables["automation_rules"]["Row"];
export type AutomationRuleInsert = Tables["automation_rules"]["Insert"];
export type Comment = Tables["comments"]["Row"];
export type CommentReply = Tables["comment_replies"]["Row"];
export type ActivityLog = Tables["activity_logs"]["Row"];

export type MatchType = "contains" | "exact" | "starts_with" | "ends_with";
export type ReplyStatus = "simulated" | "sent" | "failed";
export type ActivityStatus = "info" | "success" | "warning" | "error" | "demo";

export type ActivityType =
  | "rule_created"
  | "rule_updated"
  | "rule_deleted"
  | "rule_enabled"
  | "rule_disabled"
  | "comment_received"
  | "reply_simulated"
  | "reply_sent"
  | "reply_failed"
  | "reply_skipped"
  | "instagram_connected"
  | "instagram_disconnected"
  | "profile_updated"
  | "settings_updated";

export type CommentWithReply = Comment & { comment_replies: CommentReply[] };

export const MATCH_TYPE_LABELS: Record<MatchType, string> = {
  contains: "Contains",
  exact: "Exact match",
  starts_with: "Starts with",
  ends_with: "Ends with",
};
