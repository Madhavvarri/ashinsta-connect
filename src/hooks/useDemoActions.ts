import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { IS_DEMO } from "@/lib/config";
import { friendlyError } from "@/lib/format";
import { processComment, type ProcessResult } from "@/services/automation/engine";
import { SAMPLE_COMMENTS, SAMPLE_RULES, demoCommentId } from "@/services/automation/demo";
import { DemoReplyProvider } from "@/services/instagram/provider";
import { useInvalidateAll } from "@/hooks/queries";
import type { InstagramAccount } from "@/types";

const provider = new DemoReplyProvider();

/**
 * Demo Mode actions. These run the real automation engine in the browser
 * (RLS-scoped to the signed-in user) against a simulated Instagram provider.
 */
export function useDemoActions(account: InstagramAccount | null | undefined) {
  const { user } = useAuth();
  const invalidate = useInvalidateAll();
  const uid = user?.id ?? "";

  const guard = () => {
    if (!IS_DEMO) throw new Error("Demo actions are only available in Demo Mode.");
    if (!uid) throw new Error("Not authenticated");
  };

  const generateSampleComments = useMutation({
    mutationFn: async (): Promise<ProcessResult[]> => {
      guard();
      const results: ProcessResult[] = [];
      for (const c of SAMPLE_COMMENTS) {
        results.push(
          await processComment(supabase, provider, {
            userId: uid,
            instagramAccountId: account?.id ?? null,
            instagramCommentId: demoCommentId(),
            username: c.username,
            commentText: c.text,
            postId: c.post,
            isDemo: true,
          }),
        );
      }
      return results;
    },
    onSuccess: (results) => {
      const replied = results.filter((r) => r.status === "simulated").length;
      toast.success(`${results.length} demo comments generated`, {
        description: `${replied} simulated ${replied === 1 ? "reply" : "replies"} — no real Instagram activity.`,
      });
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e, "Could not generate demo comments.")),
  });

  const simulateComment = useMutation({
    mutationFn: async (input: { username: string; comment_text: string }) => {
      guard();
      return processComment(supabase, provider, {
        userId: uid,
        instagramAccountId: account?.id ?? null,
        instagramCommentId: demoCommentId(),
        username: input.username,
        commentText: input.comment_text,
        postId: "demo_post_manual",
        isDemo: true,
      });
    },
    onSuccess: (r) => {
      if (r.status === "simulated") {
        toast.success("Demo reply simulated", { description: `Rule "${r.matchedRule?.keyword}" matched.` });
      } else if (r.status === "no_match") {
        toast.info("Comment stored — no active rule matched");
      } else if (r.status === "failed") {
        toast.error("Simulated reply failed", { description: r.error });
      }
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e, "Could not simulate the comment.")),
  });

  const createSampleRules = useMutation({
    mutationFn: async () => {
      guard();
      const { error } = await supabase.from("automation_rules").insert(
        SAMPLE_RULES.map((r) => ({ ...r, user_id: uid, instagram_account_id: account?.id ?? null })),
      );
      if (error) throw new Error(error.message);
      await supabase.from("activity_logs").insert({
        user_id: uid,
        type: "rule_created",
        status: "demo",
        message: `${SAMPLE_RULES.length} sample rules created (Demo)`,
        metadata: { demo: true } as never,
      });
    },
    onSuccess: () => {
      toast.success("Sample rules added");
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e, "Could not add sample rules.")),
  });

  return { generateSampleComments, simulateComment, createSampleRules };
}
