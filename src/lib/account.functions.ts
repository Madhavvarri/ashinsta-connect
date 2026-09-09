import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Permanently deletes the signed-in user's account. All of their rows cascade
 * away through the per-user tables (deleted explicitly here, then the auth user).
 */
export const deleteOwnAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Remove app data as the user (RLS-scoped).
    const tables = [
      "activity_logs",
      "comment_replies",
      "comments",
      "automation_rules",
      "instagram_accounts",
      "profiles",
    ] as const;
    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq("user_id", userId);
      if (error) throw new Error(`Could not remove ${table}`);
    }

    // Privileged: remove the auth user itself. Loaded inside the handler only.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error("Could not delete account");
    return { ok: true };
  });
