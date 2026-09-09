import { format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";

export function timeAgo(value: string | Date): string {
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
}

export function formatDateTime(value: string | Date): string {
  const d = new Date(value);
  if (isToday(d)) return `Today, ${format(d, "h:mm a")}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, "h:mm a")}`;
  return format(d, "d MMM yyyy, h:mm a");
}

export function formatDate(value: string | Date): string {
  return format(new Date(value), "d MMM yyyy");
}

export function initials(name: string | null | undefined, fallback = "?"): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function percent(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

/** Turn any thrown value into a safe, user-friendly message (never leaks DB internals). */
export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const lower = message.toLowerCase();
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Network error. Check your connection and try again.";
  }
  if (lower.includes("invalid login credentials")) return "Incorrect email or password.";
  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return "An account with this email already exists. Try logging in.";
  }
  if (lower.includes("email not confirmed")) return "Please confirm your email before logging in.";
  if (lower.includes("password should be")) return "Password must be at least 8 characters.";
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (lower.includes("jwt") || lower.includes("unauthorized") || lower.includes("not authenticated")) {
    return "Your session has expired. Please log in again.";
  }
  if (lower.includes("duplicate key")) return "This item already exists.";
  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return "You don't have permission to do that.";
  }
  return fallback;
}
