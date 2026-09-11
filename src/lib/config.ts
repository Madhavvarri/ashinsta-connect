/**
 * Application configuration.
 *
 * AshConnect always runs against the real backend and the official
 * Meta / Instagram Graph API. Instagram credentials are server-side secrets:
 *   META_APP_ID, META_APP_SECRET, META_WEBHOOK_VERIFY_TOKEN (optional META_GRAPH_API_VERSION).
 */
export const APP_NAME = "AshConnect";
export const APP_TAGLINE = "Instagram Business management. Comments, messages and automation in one place.";

/** Path (same origin) Meta redirects back to after Instagram login. */
export const INSTAGRAM_CALLBACK_PATH = "/instagram-callback";
