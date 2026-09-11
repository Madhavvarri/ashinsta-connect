import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ConversationSummary, ThreadMessage } from "@/services/instagram/messaging.server";

/**
 * Instagram Messaging (official Instagram API with Instagram Login).
 *
 * Messaging needs `instagram_business_manage_messages`, which Meta only grants
 * after App Review approval. When it is missing we return status "needs_review"
 * so the UI can explain that instead of erroring or inventing data.
 */

export type MessagingStatus = "ok" | "not_connected" | "not_configured" | "needs_review";

interface Account {
  id: string;
  instagram_user_id: string;
  access_token: string | null;
  granted_scopes: string[];
}

/** Loads the signed-in user's connected account (RLS-scoped) plus server Meta config. */
async function loadContext(supabase: {
  from: (t: "instagram_accounts") => {
    select: (c: string) => {
      eq: (c: string, v: unknown) => {
        eq: (c: string, v: unknown) => {
          order: (c: string, o: { ascending: boolean }) => {
            limit: (n: number) => { maybeSingle: () => Promise<{ data: Account | null; error: unknown }> };
          };
        };
      };
    };
  };
}, userId: string) {
  const meta = await import("@/services/instagram/meta.server");
  const cfg = meta.readMetaConfig();
  if (!cfg) return { status: "not_configured" as const };

  const { data: account } = await supabase
    .from("instagram_accounts")
    .select("id, instagram_user_id, access_token, granted_scopes")
    .eq("user_id", userId)
    .eq("connected", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!account?.access_token) return { status: "not_connected" as const };

  const messaging = await import("@/services/instagram/messaging.server");
  const scopes = account.granted_scopes ?? [];
  // Empty scopes = older connection that predates scope storage; let the API decide.
  if (scopes.length > 0 && !scopes.includes(messaging.MESSAGING_SCOPE)) {
    return { status: "needs_review" as const };
  }
  return { status: "ok" as const, cfg, account, messaging };
}

function isPermissionError(err: unknown): boolean {
  return err instanceof Error && err.name === "MessagingPermissionError";
}

/** Lists the account's Instagram conversations. */
export const getInstagramConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ status: MessagingStatus; conversations: ConversationSummary[] }> => {
    const ctx = await loadContext(context.supabase as never, context.userId);
    if (ctx.status !== "ok") return { status: ctx.status, conversations: [] };
    try {
      const conversations = await ctx.messaging.listConversations(
        ctx.cfg,
        ctx.account.instagram_user_id,
        ctx.account.access_token!,
      );
      return { status: "ok", conversations };
    } catch (err) {
      if (isPermissionError(err)) return { status: "needs_review", conversations: [] };
      throw err;
    }
  });

/** Loads the messages in one conversation. */
export const getConversationMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversationId: string }) =>
    z.object({ conversationId: z.string().min(1).max(256) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ status: MessagingStatus; messages: ThreadMessage[] }> => {
    const ctx = await loadContext(context.supabase as never, context.userId);
    if (ctx.status !== "ok") return { status: ctx.status, messages: [] };
    try {
      const messages = await ctx.messaging.getConversationMessages(
        ctx.cfg,
        data.conversationId,
        ctx.account.instagram_user_id,
        ctx.account.access_token!,
      );
      return { status: "ok", messages };
    } catch (err) {
      if (isPermissionError(err)) return { status: "needs_review", messages: [] };
      throw err;
    }
  });

/** Sends a text reply to a conversation participant and records it. */
export const sendInstagramMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { recipientId: string; text: string; conversationId?: string }) =>
    z
      .object({
        recipientId: z.string().min(1).max(128),
        text: z.string().trim().min(1, "Message is required").max(1000, "Message is too long"),
        conversationId: z.string().max(256).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ status: MessagingStatus; messageId: string | null }> => {
    const { supabase, userId } = context;
    const ctx = await loadContext(supabase as never, userId);
    if (ctx.status !== "ok") return { status: ctx.status, messageId: null };

    let sent: { messageId: string | null; recipientId: string };
    try {
      sent = await ctx.messaging.sendMessage(
        ctx.cfg,
        ctx.account.instagram_user_id,
        ctx.account.access_token!,
        data.recipientId,
        data.text,
      );
    } catch (err) {
      if (isPermissionError(err)) return { status: "needs_review", messageId: null };
      await supabase.from("activity_logs").insert({
        user_id: userId,
        type: "reply_failed",
        status: "error",
        message: "Instagram message could not be sent",
        metadata: { error: err instanceof Error ? err.message : "Unknown error" } as never,
      });
      throw err;
    }

    await supabase.from("instagram_messages").insert({
      user_id: userId,
      instagram_account_id: ctx.account.id,
      conversation_id: data.conversationId ?? "",
      message_id: sent.messageId ?? `out_${Date.now()}`,
      sender_id: ctx.account.instagram_user_id,
      recipient_id: sent.recipientId,
      message_text: data.text,
      direction: "outgoing",
    });

    await supabase.from("activity_logs").insert({
      user_id: userId,
      type: "reply_sent",
      status: "success",
      message: "Instagram message sent",
      metadata: { conversation_id: data.conversationId ?? null, message_id: sent.messageId } as never,
    });

    return { status: "ok", messageId: sent.messageId };
  });
