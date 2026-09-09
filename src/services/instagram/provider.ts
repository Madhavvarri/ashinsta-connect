/**
 * Instagram reply providers.
 *
 * The automation engine never talks to Instagram directly — it asks a provider.
 * - DemoReplyProvider: simulates a reply. Never contacts Instagram.
 * - MetaGraphReplyProvider: sends a real reply through the official Instagram
 *   Graph API (POST /{comment-id}/replies). Requires a valid access token that
 *   was obtained through official Meta OAuth. Server-side only.
 */

export interface SendReplyInput {
  instagramCommentId: string;
  message: string;
  /** Access token for the connected Instagram professional account (production only). */
  accessToken?: string | null;
}

export interface SendReplyResult {
  ok: boolean;
  /** "simulated" for demo, "sent" when Meta confirmed, "failed" otherwise */
  status: "simulated" | "sent" | "failed";
  providerReplyId?: string;
  error?: string;
}

export interface ReplyProvider {
  readonly name: string;
  readonly isDemo: boolean;
  sendReply(input: SendReplyInput): Promise<SendReplyResult>;
}

export class DemoReplyProvider implements ReplyProvider {
  readonly name = "demo";
  readonly isDemo = true;

  async sendReply(input: SendReplyInput): Promise<SendReplyResult> {
    // Small artificial delay so the UI shows a realistic loading state.
    await new Promise((r) => setTimeout(r, 150));
    if (!input.message.trim()) {
      return { ok: false, status: "failed", error: "Reply message is empty" };
    }
    return {
      ok: true,
      status: "simulated",
      providerReplyId: `demo_${Math.random().toString(36).slice(2, 10)}`,
    };
  }
}

export class MetaGraphReplyProvider implements ReplyProvider {
  readonly name = "meta-graph";
  readonly isDemo = false;

  constructor(private readonly apiVersion = "v21.0") {}

  async sendReply(input: SendReplyInput): Promise<SendReplyResult> {
    if (!input.accessToken) {
      return { ok: false, status: "failed", error: "Instagram account has no access token" };
    }
    try {
      const url = `https://graph.facebook.com/${this.apiVersion}/${encodeURIComponent(
        input.instagramCommentId,
      )}/replies`;
      const body = new URLSearchParams({ message: input.message, access_token: input.accessToken });
      const res = await fetch(url, { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: { message?: string; code?: number };
      };
      if (!res.ok || !json.id) {
        return {
          ok: false,
          status: "failed",
          error: json.error?.message ?? `Meta API responded with ${res.status}`,
        };
      }
      return { ok: true, status: "sent", providerReplyId: json.id };
    } catch (err) {
      return {
        ok: false,
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown network error",
      };
    }
  }
}

export function createReplyProvider(mode: "demo" | "production"): ReplyProvider {
  return mode === "production" ? new MetaGraphReplyProvider() : new DemoReplyProvider();
}
