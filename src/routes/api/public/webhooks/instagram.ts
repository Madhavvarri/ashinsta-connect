import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { processComment } from "@/services/automation/engine";
import { createReplyProvider } from "@/services/instagram/provider";

/**
 * Official Meta / Instagram webhook endpoint.
 *
 * GET  — subscription verification (hub.mode / hub.verify_token / hub.challenge)
 * POST — comment events, validated with X-Hub-Signature-256 (HMAC of raw body
 *        using META_APP_SECRET), then processed by the automation engine.
 *
 * Configure META_APP_SECRET and META_WEBHOOK_VERIFY_TOKEN as server secrets
 * before pointing Meta at this URL.
 */

const eventSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z
        .array(
          z.object({
            field: z.string(),
            value: z
              .object({
                id: z.string().optional(),
                text: z.string().optional(),
                from: z.object({ id: z.string().optional(), username: z.string().optional() }).optional(),
                media: z.object({ id: z.string().optional() }).optional(),
              })
              .passthrough(),
          }),
        )
        .default([]),
    }),
  ),
});

export const Route = createFileRoute("/api/public/webhooks/instagram")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const expected = process.env["META_WEBHOOK_VERIFY_TOKEN"];
        if (!expected) return new Response("Webhook not configured", { status: 503 });
        if (mode === "subscribe" && token && challenge && safeEqual(token, expected)) {
          return new Response(challenge, { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },

      POST: async ({ request }) => {
        const secret = process.env["META_APP_SECRET"];
        if (!secret) return new Response("Webhook not configured", { status: 503 });

        const raw = await request.text();
        const signature = request.headers.get("x-hub-signature-256") ?? "";
        const expected = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
        if (!safeEqual(signature, expected)) return new Response("Invalid signature", { status: 401 });

        const parsed = eventSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) return new Response("Bad request", { status: 400 });
        if (parsed.data.object !== "instagram") return new Response("ok");

        const provider = createReplyProvider(process.env["META_GRAPH_API_VERSION"]);
        // Privileged client: webhooks carry no user session. Loaded inside the handler.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        for (const entry of parsed.data.entry) {
          for (const change of entry.changes) {
            if (change.field !== "comments" || !change.value.id || !change.value.text) continue;
            const { data: account } = await supabaseAdmin
              .from("instagram_accounts")
              .select("id, user_id, instagram_user_id, access_token")
              .eq("instagram_user_id", entry.id)
              .eq("connected", true)
              .maybeSingle();
            if (!account) continue;
            // Ignore the account's own comments/replies so we never reply to ourselves.
            if (change.value.from?.id && change.value.from.id === account.instagram_user_id) continue;
            try {
              await processComment(supabaseAdmin, provider, {
                userId: account.user_id,
                instagramAccountId: account.id,
                instagramCommentId: change.value.id,
                username: change.value.from?.username ?? "unknown",
                commentText: change.value.text,
                postId: change.value.media?.id ?? "",
                accessToken: account.access_token,
              });
            } catch (err) {
              console.error("[webhook] failed to process comment", err);
            }
          }
        }
        return new Response("ok");
      },
    },
  },
});

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
