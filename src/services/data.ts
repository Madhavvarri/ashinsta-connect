/**
 * Data access layer — all reads/writes go through the browser client with RLS,
 * so users can only ever touch their own rows.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  ActivityLog,
  AutomationRule,
  CommentReply,
  CommentWithReply,
  InstagramAccount,
  Profile,
} from "@/types";
import type { RuleValues } from "@/lib/validation";
import { logActivity } from "@/services/automation/engine";

function unwrap<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null || res.data === undefined) throw new Error("No data returned");
  return res.data as NonNullable<T>;
}

// ---------- Profile ----------
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function ensureProfile(userId: string, email: string, fullName: string): Promise<Profile> {
  const existing = await getProfile(userId);
  if (existing) return existing;
  return unwrap(
    await supabase
      .from("profiles")
      .insert({ user_id: userId, email, full_name: fullName })
      .select("*")
      .single(),
  );
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, "full_name" | "default_automation_active" | "notifications_enabled">>,
): Promise<Profile> {
  const data = unwrap(
    await supabase.from("profiles").update(patch).eq("user_id", userId).select("*").single(),
  ) as unknown as Profile;
  await logActivity(supabase, userId, {
    type: "full_name" in patch ? "profile_updated" : "settings_updated",
    status: "info",
    message: "full_name" in patch ? "Profile updated" : "Automation settings updated",
    metadata: patch,
  });
  return data;
}

// ---------- Instagram account ----------
const IG_COLUMNS =
  "id, user_id, instagram_user_id, username, profile_picture, token_expires_at, connected, is_demo, created_at, updated_at";

export async function getInstagramAccount(userId: string): Promise<InstagramAccount | null> {
  const { data, error } = await supabase
    .from("instagram_accounts")
    .select(IG_COLUMNS)
    .eq("user_id", userId)
    .eq("connected", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as InstagramAccount | null;
}

export async function disconnectInstagram(userId: string, account: InstagramAccount): Promise<void> {
  const { error } = await supabase
    .from("instagram_accounts")
    .update({ connected: false, access_token: null })
    .eq("id", account.id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  await logActivity(supabase, userId, {
    type: "instagram_disconnected",
    status: "info",
    message: `Instagram account @${account.username} disconnected`,
    metadata: { account_id: account.id },
  });
}

// ---------- Rules ----------
export async function listRules(userId: string): Promise<AutomationRule[]> {
  return unwrap(
    await supabase
      .from("automation_rules")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  );
}

export async function createRule(
  userId: string,
  values: RuleValues,
  instagramAccountId: string | null,
): Promise<AutomationRule> {
  const data = unwrap(
    await supabase
      .from("automation_rules")
      .insert({ ...values, user_id: userId, instagram_account_id: instagramAccountId })
      .select("*")
      .single(),
  ) as unknown as AutomationRule;
  await logActivity(supabase, userId, {
    type: "rule_created",
    status: "success",
    message: `Rule "${data.keyword}" created`,
    metadata: { rule_id: data.id },
  });
  return data;
}

export async function updateRule(userId: string, id: string, values: RuleValues): Promise<AutomationRule> {
  const data = unwrap(
    await supabase.from("automation_rules").update(values).eq("id", id).eq("user_id", userId).select("*").single(),
  ) as unknown as AutomationRule;
  await logActivity(supabase, userId, {
    type: "rule_updated",
    status: "info",
    message: `Rule "${data.keyword}" updated`,
    metadata: { rule_id: data.id },
  });
  return data;
}

export async function toggleRule(userId: string, rule: AutomationRule, isActive: boolean): Promise<AutomationRule> {
  const data = unwrap(
    await supabase
      .from("automation_rules")
      .update({ is_active: isActive })
      .eq("id", rule.id)
      .eq("user_id", userId)
      .select("*")
      .single(),
  ) as unknown as AutomationRule;
  await logActivity(supabase, userId, {
    type: isActive ? "rule_enabled" : "rule_disabled",
    status: isActive ? "success" : "warning",
    message: `Rule "${rule.keyword}" ${isActive ? "enabled" : "disabled"}`,
    metadata: { rule_id: rule.id },
  });
  return data;
}

export async function deleteRule(userId: string, rule: AutomationRule): Promise<void> {
  const { error } = await supabase.from("automation_rules").delete().eq("id", rule.id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  await logActivity(supabase, userId, {
    type: "rule_deleted",
    status: "warning",
    message: `Rule "${rule.keyword}" deleted`,
    metadata: { rule_id: rule.id },
  });
}

// ---------- Comments ----------
export async function listComments(userId: string, limit = 200): Promise<CommentWithReply[]> {
  return unwrap(
    await supabase
      .from("comments")
      .select("*, comment_replies(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ) as CommentWithReply[];
}

export async function listReplies(userId: string): Promise<CommentReply[]> {
  return unwrap(
    await supabase
      .from("comment_replies")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1000),
  );
}

// ---------- Activity ----------
export async function listActivity(userId: string, limit = 300): Promise<ActivityLog[]> {
  return unwrap(
    await supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
  );
}

// ---------- Aggregates ----------
export interface DashboardStats {
  connectedAccounts: number;
  totalComments: number;
  repliesSent: number;
  repliesFailed: number;
  activeRules: number;
  totalRules: number;
  successRate: number;
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [accounts, comments, replies, rules] = await Promise.all([
    supabase
      .from("instagram_accounts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("connected", true),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("comment_replies").select("status").eq("user_id", userId).limit(5000),
    supabase.from("automation_rules").select("is_active").eq("user_id", userId),
  ]);
  for (const r of [accounts, comments, replies, rules]) {
    if (r.error) throw new Error(r.error.message);
  }
  const replyRows = replies.data ?? [];
  const sent = replyRows.filter((r) => r.status === "sent").length;
  const failed = replyRows.filter((r) => r.status === "failed").length;
  const total = replyRows.length;
  const ruleRows = rules.data ?? [];
  return {
    connectedAccounts: accounts.count ?? 0,
    totalComments: comments.count ?? 0,
    repliesSent: sent,
    repliesFailed: failed,
    activeRules: ruleRows.filter((r) => r.is_active).length,
    totalRules: ruleRows.length,
    successRate: total ? Math.round((sent / total) * 100) : 0,
  };
}
