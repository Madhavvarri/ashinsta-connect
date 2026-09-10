import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { INSTAGRAM_CALLBACK_PATH } from "@/lib/config";

/**
 * Official Meta / Instagram connection (Instagram API with Instagram Login).
 * All Meta credentials stay on the server. Rows are written as the signed-in
 * user through RLS.
 */

const redirectUriSchema = z
  .string()
  .url()
  .refine((u) => {
    const url = new URL(u);
    const secure = url.protocol === "https:" || url.hostname === "localhost";
    return secure && url.pathname === INSTAGRAM_CALLBACK_PATH && !url.search && !url.hash;
  }, "Invalid redirect URI");

/** Tells the UI whether Meta credentials are configured (never reveals values). */
export const getInstagramSetupStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const missing: string[] = [];
    if (!process.env["META_APP_ID"]) missing.push("META_APP_ID");
    if (!process.env["META_APP_SECRET"]) missing.push("META_APP_SECRET");
    if (!process.env["META_WEBHOOK_VERIFY_TOKEN"]) missing.push("META_WEBHOOK_VERIFY_TOKEN");
    return { configured: missing.length === 0, missing };
  });

/** Builds the Meta authorize URL. `state` is generated client-side and verified on return. */
export const getInstagramConnectUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { redirectUri: string; state: string }) =>
    z.object({ redirectUri: redirectUriSchema, state: z.string().min(16).max(128) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { readMetaConfig, buildAuthorizeUrl } = await import("@/services/instagram/meta.server");
    const cfg = readMetaConfig();
    if (!cfg) throw new Error("Instagram is not configured yet. Add META_APP_ID and META_APP_SECRET.");
    return { url: buildAuthorizeUrl(cfg, data.redirectUri, data.state) };
  });

/** Exchanges the OAuth code, loads the profile, stores the account and subscribes to comment webhooks. */
export const completeInstagramConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string; redirectUri: string }) =>
    z.object({ code: z.string().min(1).max(2048), redirectUri: redirectUriSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const meta = await import("@/services/instagram/meta.server");
    const cfg = meta.readMetaConfig();
    if (!cfg) throw new Error("Instagram is not configured yet. Add META_APP_ID and META_APP_SECRET.");

    // Meta sometimes appends "#_" to the code in the redirect.
    const code = data.code.replace(/#_$/, "");
    const { accessToken, expiresAt } = await meta.exchangeCodeForLongLivedToken(cfg, code, data.redirectUri);
    const profile = await meta.fetchInstagramProfile(cfg, accessToken);

    // Disconnect any previous connections for this user, then upsert this account.
    await supabase.from("instagram_accounts").update({ connected: false, access_token: null }).eq("user_id", userId);

    const { data: existing } = await supabase
      .from("instagram_accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("instagram_user_id", profile.instagramUserId)
      .maybeSingle();

    const payload = {
      user_id: userId,
      instagram_user_id: profile.instagramUserId,
      username: profile.username,
      profile_picture: profile.profilePicture,
      access_token: accessToken,
      token_expires_at: expiresAt,
      connected: true,
    };
    const saved = existing
      ? await supabase.from("instagram_accounts").update(payload).eq("id", existing.id).select("id, username").single()
      : await supabase.from("instagram_accounts").insert(payload).select("id, username").single();
    if (saved.error || !saved.data) throw new Error(saved.error?.message ?? "Could not save the Instagram account");

    let webhookWarning: string | null = null;
    try {
      await meta.subscribeToCommentWebhooks(cfg, profile.instagramUserId, accessToken);
    } catch (err) {
      webhookWarning = err instanceof Error ? err.message : "Could not subscribe to comment notifications";
    }

    await supabase.from("activity_logs").insert({
      user_id: userId,
      type: "instagram_connected",
      status: webhookWarning ? "warning" : "success",
      message: webhookWarning
        ? `Instagram account @${profile.username} connected, but comment notifications could not be enabled`
        : `Instagram account @${profile.username} connected`,
      metadata: { account_id: saved.data.id, webhook_warning: webhookWarning } as never,
    });

    return { username: profile.username, webhookWarning };
  });
