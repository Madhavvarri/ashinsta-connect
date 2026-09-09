import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { AutomationRule, ReplyStatus } from "@/types";
import { evaluateRules, selectRule, type RuleEvaluation } from "./matcher";
import type { ReplyProvider } from "@/services/instagram/provider";

type Client = SupabaseClient<Database>;

export interface IncomingComment {
  userId: string;
  instagramAccountId: string | null;
  instagramCommentId: string;
  username: string;
  commentText: string;
  postId: string;
  isDemo: boolean;
  /** Production only: access token for sending the reply. */
  accessToken?: string | null;
}

export interface ProcessResult {
  commentId: string;
  matchedRule: AutomationRule | null;
  status: ReplyStatus | "no_match" | "skipped";
  replyText: string | null;
  error?: string;
  evaluations: RuleEvaluation[];
}

/**
 * Reusable automation engine.
 *
 * Flow: store comment → load active rules → evaluate (match type, case, cooldown)
 * → select rule → send reply via provider → store reply → log activity.
 *
 * Works with any Supabase client: the browser client (RLS as the user, demo mode)
 * or the server admin client (webhooks). It never claims a real reply was sent
 * unless the provider returned status "sent".
 */
export async function processComment(
  client: Client,
  provider: ReplyProvider,
  input: IncomingComment,
): Promise<ProcessResult> {
  // 1. Store the comment (idempotent per instagram_comment_id).
  const { data: existing } = await client
    .from("comments")
    .select("id, replied")
    .eq("user_id", input.userId)
    .eq("instagram_comment_id", input.instagramCommentId)
    .maybeSingle();

  let commentId: string;
  if (existing) {
    commentId = existing.id;
    if (existing.replied) {
      return {
        commentId,
        matchedRule: null,
        status: "skipped",
        replyText: null,
        error: "Comment already handled",
        evaluations: [],
      };
    }
  } else {
    const { data: inserted, error: insertError } = await client
      .from("comments")
      .insert({
        user_id: input.userId,
        instagram_account_id: input.instagramAccountId,
        instagram_comment_id: input.instagramCommentId,
        username: input.username,
        comment_text: input.commentText,
        post_id: input.postId,
        is_demo: input.isDemo,
      })
      .select("id")
      .single();
    if (insertError || !inserted) {
      throw new Error(insertError?.message ?? "Could not store comment");
    }
    commentId = inserted.id;
    await logActivity(client, input.userId, {
      type: "comment_received",
      status: input.isDemo ? "demo" : "info",
      message: `${input.isDemo ? "Demo comment" : "Comment"} received from @${input.username}`,
      metadata: { comment_id: commentId, username: input.username, is_demo: input.isDemo },
    });
  }

  // 2. Load the user's rules.
  const { data: rules, error: rulesError } = await client
    .from("automation_rules")
    .select("*")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: true });
  if (rulesError) throw new Error(rulesError.message);

  const activeRules = (rules ?? []).filter((r) => r.is_active);
  if (activeRules.length === 0) {
    return { commentId, matchedRule: null, status: "no_match", replyText: null, evaluations: [] };
  }

  // 3. Cooldown data: last reply per rule.
  const lastRepliedAt = await getLastRepliedAt(client, input.userId, activeRules.map((r) => r.id));

  // 4. Evaluate + select.
  const evaluations = evaluateRules(input.commentText, activeRules, { lastRepliedAt });
  const selected = selectRule(evaluations);

  if (!selected) {
    const inCooldown = evaluations.find((e) => e.matched && e.cooldownEndsAt);
    if (inCooldown) {
      await logActivity(client, input.userId, {
        type: "reply_skipped",
        status: "warning",
        message: `Reply to @${input.username} skipped — rule "${inCooldown.rule.keyword}" is in cooldown`,
        metadata: { comment_id: commentId, rule_id: inCooldown.rule.id },
      });
    }
    return { commentId, matchedRule: null, status: "no_match", replyText: null, evaluations };
  }

  const rule = selected.rule;
  const replyText = rule.reply_message;

  // 5. Send through provider (demo = simulate, production = official Meta API).
  const result = await provider.sendReply({
    instagramCommentId: input.instagramCommentId,
    message: replyText,
    accessToken: input.accessToken ?? null,
  });

  const status: ReplyStatus = result.status;
  const isDemo = provider.isDemo || input.isDemo;

  // 6. Store the reply.
  const { error: replyError } = await client.from("comment_replies").insert({
    user_id: input.userId,
    comment_id: commentId,
    rule_id: rule.id,
    reply_text: replyText,
    status,
    is_demo: isDemo,
    error_message: result.error ?? null,
    replied_at: result.ok ? new Date().toISOString() : null,
  });
  if (replyError) throw new Error(replyError.message);

  if (result.ok) {
    await client.from("comments").update({ replied: true }).eq("id", commentId);
  }

  // 7. Activity log — never say "sent" unless Meta confirmed.
  if (status === "simulated") {
    await logActivity(client, input.userId, {
      type: "reply_simulated",
      status: "demo",
      message: `Demo reply simulated to @${input.username} (rule "${rule.keyword}")`,
      metadata: { comment_id: commentId, rule_id: rule.id, demo: true },
    });
  } else if (status === "sent") {
    await logActivity(client, input.userId, {
      type: "reply_sent",
      status: "success",
      message: `Reply sent to @${input.username} (rule "${rule.keyword}")`,
      metadata: { comment_id: commentId, rule_id: rule.id, provider_reply_id: result.providerReplyId },
    });
  } else {
    await logActivity(client, input.userId, {
      type: "reply_failed",
      status: "error",
      message: `Reply to @${input.username} failed (rule "${rule.keyword}")`,
      metadata: { comment_id: commentId, rule_id: rule.id, error: result.error },
    });
  }

  return { commentId, matchedRule: rule, status, replyText, error: result.error, evaluations };
}

export async function getLastRepliedAt(
  client: Client,
  userId: string,
  ruleIds: string[],
): Promise<Record<string, string | null>> {
  if (ruleIds.length === 0) return {};
  const { data } = await client
    .from("comment_replies")
    .select("rule_id, replied_at")
    .eq("user_id", userId)
    .in("rule_id", ruleIds)
    .not("replied_at", "is", null)
    .order("replied_at", { ascending: false })
    .limit(500);
  const map: Record<string, string | null> = {};
  for (const row of data ?? []) {
    if (row.rule_id && !map[row.rule_id]) map[row.rule_id] = row.replied_at;
  }
  return map;
}

export interface ActivityInput {
  type: string;
  message: string;
  status?: "info" | "success" | "warning" | "error" | "demo";
  metadata?: Record<string, unknown>;
}

export async function logActivity(client: Client, userId: string, input: ActivityInput) {
  const { error } = await client.from("activity_logs").insert({
    user_id: userId,
    type: input.type,
    message: input.message,
    status: input.status ?? "info",
    metadata: (input.metadata ?? {}) as never,
  });
  if (error) console.error("[activity] failed to log:", error.message);
}
