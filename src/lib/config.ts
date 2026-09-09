/**
 * Application configuration.
 *
 * APP_MODE controls whether Ashinsta runs against the real Meta / Instagram
 * Graph API ("production") or a clearly-labelled simulation ("demo").
 *
 * - Browser: set VITE_APP_MODE in the environment (defaults to "demo").
 * - Server (webhooks): set APP_MODE (defaults to "demo").
 */
export type AppMode = "demo" | "production";

function normalize(value: string | undefined): AppMode {
  return value === "production" ? "production" : "demo";
}

export const APP_MODE: AppMode = normalize(import.meta.env["VITE_APP_MODE"] as string | undefined);
export const IS_DEMO = APP_MODE === "demo";

/** Server-side mode check (reads process.env at call time). */
export function getServerAppMode(): AppMode {
  return normalize(process.env["APP_MODE"]);
}

export const APP_NAME = "Ashinsta";
export const APP_TAGLINE = "Automate Instagram conversations. Grow engagement.";
