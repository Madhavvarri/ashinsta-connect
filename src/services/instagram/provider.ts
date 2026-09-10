/**
 * Instagram reply provider.
 *
 * The automation engine never talks to Instagram directly — it asks a provider.
 * MetaGraphReplyProvider sends a real reply through the official Instagram
 * Graph API (POST /{comment-id}/replies) using an access token obtained via
 * official Meta OAuth. Server-side only.
 */

export const DEFAULT_GRAPH_API_VERSION = "v21.0";
export const GRAPH_BASE_URL = "https://graph.instagram.com";

export interface SendReplyInput {
  instagramCommentId: string;
  message: string;
  /** Access token for the connected Instagram professional account. */
  accessToken?: string | null;
}

export interface SendReplyResult {
  ok: boolean;
  /** "sent" when Meta confirmed, "failed" otherwise */
  status: "sent" | "failed";
  providerReplyId?: string;
  error?: string;
}

export interface ReplyProvider {
  readonly name: string;
  sendReply(input: SendReplyInput): Promise<SendReplyResult>;
}

export class MetaGraphReplyProvider implements ReplyProvider {
  readonly name = "meta-graph";

  constructor(private readonly apiVersion = DEFAULT_GRAPH_API_VERSION) {}

  async sendReply(input: SendReplyInput): Promise<SendReplyResult> {
    if (!input.accessToken) {
      return { ok: false, status: "failed", error: "Instagram account has no access token — reconnect Instagram" };
    }
    try {
      const url = `${GRAPH_BASE_URL}/${this.apiVersion}/${encodeURIComponent(input.instagramCommentId)}/replies`;
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

export function createReplyProvider(apiVersion?: string): ReplyProvider {
  return new MetaGraphReplyProvider(apiVersion ?? DEFAULT_GRAPH_API_VERSION);
}
