/**
 * Server-only helpers for Instagram Messaging (Instagram API with Instagram Login).
 * Never imported by browser code.
 *
 * Requires the connected account to have granted `instagram_business_manage_messages`,
 * which Meta only issues after App Review approves that permission.
 */
import { GRAPH_BASE_URL } from "./provider";
import type { MetaConfig } from "./meta.server";

export const MESSAGING_SCOPE = "instagram_business_manage_messages";

/** Meta error codes/subcodes that mean "this permission is not granted/approved". */
const PERMISSION_ERROR_CODES = new Set([10, 200, 190, 3]);

export class MessagingPermissionError extends Error {
  constructor(message = "Instagram messaging access has not been granted for this account yet.") {
    super(message);
    this.name = "MessagingPermissionError";
  }
}

interface GraphErrorBody {
  error?: { message?: string; code?: number; error_subcode?: number; type?: string };
}

async function messagingJson<T>(res: Response, fallback: string): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as T & GraphErrorBody;
  if (!res.ok) {
    const err = json.error;
    const code = err?.code ?? 0;
    const message = err?.message ?? `${fallback} (${res.status})`;
    if (res.status === 403 || PERMISSION_ERROR_CODES.has(code) || /permission|scope|approved/i.test(message)) {
      throw new MessagingPermissionError(message);
    }
    throw new Error(message);
  }
  return json;
}

export interface ConversationSummary {
  id: string;
  participantId: string | null;
  participantUsername: string;
  updatedTime: string | null;
  snippet: string;
}

export interface ThreadMessage {
  id: string;
  from: string;
  fromUsername: string;
  text: string;
  createdTime: string | null;
  outgoing: boolean;
}

/** GET /{ig-id}/conversations — the account's message threads. */
export async function listConversations(
  cfg: MetaConfig,
  instagramUserId: string,
  accessToken: string,
): Promise<ConversationSummary[]> {
  const params = new URLSearchParams({
    fields: "id,updated_time,participants,messages.limit(1){id,message,from,created_time}",
    platform: "instagram",
    limit: "50",
    access_token: accessToken,
  });
  const res = await fetch(
    `${GRAPH_BASE_URL}/${cfg.apiVersion}/${encodeURIComponent(instagramUserId)}/conversations?${params.toString()}`,
  );
  const json = await messagingJson<{
    data?: {
      id: string;
      updated_time?: string;
      participants?: { data?: { id?: string; username?: string }[] };
      messages?: { data?: { message?: string }[] };
    }[];
  }>(res, "Could not load your Instagram conversations");

  return (json.data ?? []).map((c) => {
    const other = (c.participants?.data ?? []).find((p) => p.id !== instagramUserId);
    return {
      id: c.id,
      participantId: other?.id ?? null,
      participantUsername: other?.username ?? "instagram user",
      updatedTime: c.updated_time ?? null,
      snippet: c.messages?.data?.[0]?.message ?? "",
    };
  });
}

/** GET /{conversation-id}?fields=messages — the messages in one thread. */
export async function getConversationMessages(
  cfg: MetaConfig,
  conversationId: string,
  instagramUserId: string,
  accessToken: string,
): Promise<ThreadMessage[]> {
  const params = new URLSearchParams({
    fields: "messages.limit(50){id,message,created_time,from,to}",
    access_token: accessToken,
  });
  const res = await fetch(`${GRAPH_BASE_URL}/${cfg.apiVersion}/${encodeURIComponent(conversationId)}?${params.toString()}`);
  const json = await messagingJson<{
    messages?: {
      data?: {
        id: string;
        message?: string;
        created_time?: string;
        from?: { id?: string; username?: string };
      }[];
    };
  }>(res, "Could not load this conversation");

  const rows = json.messages?.data ?? [];
  return rows
    .map((m) => ({
      id: m.id,
      from: m.from?.id ?? "",
      fromUsername: m.from?.username ?? "",
      text: m.message ?? "",
      createdTime: m.created_time ?? null,
      outgoing: (m.from?.id ?? "") === instagramUserId,
    }))
    .reverse();
}

/** POST /{ig-id}/messages — send a text reply to a participant. */
export async function sendMessage(
  cfg: MetaConfig,
  instagramUserId: string,
  accessToken: string,
  recipientId: string,
  text: string,
): Promise<{ messageId: string | null; recipientId: string }> {
  const res = await fetch(`${GRAPH_BASE_URL}/${cfg.apiVersion}/${encodeURIComponent(instagramUserId)}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      access_token: accessToken,
    }),
  });
  const json = await messagingJson<{ message_id?: string; recipient_id?: string }>(res, "Could not send the message");
  return { messageId: json.message_id ?? null, recipientId: json.recipient_id ?? recipientId };
}

/** Subscribes the account to messaging webhooks in addition to comments. */
export async function subscribeToMessagingWebhooks(cfg: MetaConfig, instagramUserId: string, accessToken: string) {
  const res = await fetch(
    `${GRAPH_BASE_URL}/${cfg.apiVersion}/${encodeURIComponent(instagramUserId)}/subscribed_apps`,
    {
      method: "POST",
      body: new URLSearchParams({
        subscribed_fields: "comments,messages",
        access_token: accessToken,
      }),
    },
  );
  await messagingJson<{ success?: boolean }>(res, "Could not subscribe to message notifications");
}
