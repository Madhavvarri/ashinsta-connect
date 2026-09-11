/**
 * Server-only helpers for the official "Instagram API with Instagram Login"
 * OAuth flow. Never imported by browser code.
 *
 * Required secrets: META_APP_ID, META_APP_SECRET. Optional: META_GRAPH_API_VERSION.
 */
import { DEFAULT_GRAPH_API_VERSION, GRAPH_BASE_URL } from "./provider";

export const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_comments",
  // Messaging requires Meta App Review approval before Instagram grants it.
  "instagram_business_manage_messages",
];

export interface MetaConfig {
  appId: string;
  appSecret: string;
  apiVersion: string;
}

export function readMetaConfig(): MetaConfig | null {
  const appId = process.env["META_APP_ID"];
  const appSecret = process.env["META_APP_SECRET"];
  if (!appId || !appSecret) return null;
  return { appId, appSecret, apiVersion: process.env["META_GRAPH_API_VERSION"] || DEFAULT_GRAPH_API_VERSION };
}

export function buildAuthorizeUrl(cfg: MetaConfig, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: INSTAGRAM_SCOPES.join(","),
    state,
    force_reauth: "true",
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

interface GraphError {
  error?: { message?: string; code?: number };
  error_message?: string;
  error_type?: string;
}

async function graphJson<T>(res: Response, fallback: string): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as T & GraphError;
  if (!res.ok) {
    throw new Error(json.error?.message ?? json.error_message ?? `${fallback} (${res.status})`);
  }
  return json;
}

/** Exchanges the OAuth code for a short-lived token, then for a 60-day long-lived token. */
export async function exchangeCodeForLongLivedToken(cfg: MetaConfig, code: string, redirectUri: string) {
  const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: cfg.appId,
      client_secret: cfg.appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });
  const short = await graphJson<{ access_token: string; user_id?: string | number; permissions?: string[] | string }>(
    shortRes,
    "Meta rejected the login code",
  );
  // Meta reports the permissions the user actually granted; App Review gates messaging.
  const grantedScopes = Array.isArray(short.permissions)
    ? short.permissions
    : typeof short.permissions === "string"
      ? short.permissions.split(",").map((p) => p.trim()).filter(Boolean)
      : [];

  const longParams = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: cfg.appSecret,
    access_token: short.access_token,
  });
  const longRes = await fetch(`${GRAPH_BASE_URL}/access_token?${longParams.toString()}`);
  const long = await graphJson<{ access_token: string; expires_in?: number }>(longRes, "Could not obtain a long-lived token");

  const expiresAt = new Date(Date.now() + (long.expires_in ?? 60 * 24 * 3600) * 1000).toISOString();
  return { accessToken: long.access_token, expiresAt, grantedScopes };
}

export async function fetchInstagramProfile(cfg: MetaConfig, accessToken: string) {
  const params = new URLSearchParams({ fields: "id,user_id,username,profile_picture_url", access_token: accessToken });
  const res = await fetch(`${GRAPH_BASE_URL}/${cfg.apiVersion}/me?${params.toString()}`);
  const me = await graphJson<{ id: string; user_id?: string | number; username: string; profile_picture_url?: string }>(
    res,
    "Could not load the Instagram profile",
  );
  return {
    instagramUserId: String(me.user_id ?? me.id),
    username: me.username,
    profilePicture: me.profile_picture_url ?? null,
  };
}

/** Subscribes the connected account to comment webhooks for this app. */
export async function subscribeToCommentWebhooks(cfg: MetaConfig, instagramUserId: string, accessToken: string) {
  const res = await fetch(
    `${GRAPH_BASE_URL}/${cfg.apiVersion}/${encodeURIComponent(instagramUserId)}/subscribed_apps`,
    { method: "POST", body: new URLSearchParams({ subscribed_fields: "comments", access_token: accessToken }) },
  );
  await graphJson<{ success?: boolean }>(res, "Could not subscribe to comment notifications");
}
