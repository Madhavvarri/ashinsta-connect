import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyError } from "@/lib/format";
import * as data from "@/services/data";
import type { AutomationRule, InstagramAccount, Profile } from "@/types";
import type { RuleValues } from "@/lib/validation";

export const keys = {
  profile: (u: string) => ["profile", u] as const,
  instagram: (u: string) => ["instagram", u] as const,
  rules: (u: string) => ["rules", u] as const,
  comments: (u: string) => ["comments", u] as const,
  replies: (u: string) => ["replies", u] as const,
  activity: (u: string) => ["activity", u] as const,
  stats: (u: string) => ["stats", u] as const,
};

function useUserId(): string {
  const { user } = useAuth();
  // Protected routes guarantee a user; fall back to empty string to keep hooks unconditional.
  return user?.id ?? "";
}

/** Invalidate everything that depends on automation data. */
export function useInvalidateAll() {
  const qc = useQueryClient();
  const uid = useUserId();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.rules(uid) }),
      qc.invalidateQueries({ queryKey: keys.comments(uid) }),
      qc.invalidateQueries({ queryKey: keys.replies(uid) }),
      qc.invalidateQueries({ queryKey: keys.activity(uid) }),
      qc.invalidateQueries({ queryKey: keys.stats(uid) }),
      qc.invalidateQueries({ queryKey: keys.instagram(uid) }),
    ]);
}

export function useProfile() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  return useQuery({
    queryKey: keys.profile(uid),
    enabled: !!uid,
    queryFn: () =>
      data.ensureProfile(
        uid,
        user?.email ?? "",
        (user?.user_metadata?.["full_name"] as string | undefined) ?? "",
      ),
  });
}

export function useUpdateProfile() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Pick<Profile, "full_name" | "default_automation_active" | "notifications_enabled">>) =>
      data.updateProfile(uid, patch),
    onSuccess: (profile) => {
      qc.setQueryData(keys.profile(uid), profile);
      qc.invalidateQueries({ queryKey: keys.activity(uid) });
    },
    onError: (e) => toast.error(friendlyError(e, "Could not save your changes.")),
  });
}

export function useInstagramAccount() {
  const uid = useUserId();
  return useQuery({ queryKey: keys.instagram(uid), enabled: !!uid, queryFn: () => data.getInstagramAccount(uid) });
}

export function useConnectDemoInstagram() {
  const uid = useUserId();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: () => data.connectDemoInstagram(uid),
    onSuccess: () => {
      toast.success("Demo Instagram account connected", { description: "This is a simulated connection." });
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e, "Could not connect the demo account.")),
  });
}

export function useDisconnectInstagram() {
  const uid = useUserId();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (account: InstagramAccount) => data.disconnectInstagram(uid, account),
    onSuccess: () => {
      toast.success("Instagram account disconnected");
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e, "Could not disconnect the account.")),
  });
}

export function useRules() {
  const uid = useUserId();
  return useQuery({ queryKey: keys.rules(uid), enabled: !!uid, queryFn: () => data.listRules(uid) });
}

export function useRuleMutations() {
  const uid = useUserId();
  const invalidate = useInvalidateAll();
  const onError = (msg: string) => (e: unknown) => toast.error(friendlyError(e, msg));

  const create = useMutation({
    mutationFn: (v: { values: RuleValues; instagramAccountId: string | null }) =>
      data.createRule(uid, v.values, v.instagramAccountId),
    onSuccess: (rule) => {
      toast.success(`Rule "${rule.keyword}" created`);
      invalidate();
    },
    onError: onError("Could not create the rule."),
  });
  const update = useMutation({
    mutationFn: (v: { id: string; values: RuleValues }) => data.updateRule(uid, v.id, v.values),
    onSuccess: (rule) => {
      toast.success(`Rule "${rule.keyword}" updated`);
      invalidate();
    },
    onError: onError("Could not update the rule."),
  });
  const toggle = useMutation({
    mutationFn: (v: { rule: AutomationRule; isActive: boolean }) => data.toggleRule(uid, v.rule, v.isActive),
    onSuccess: (rule) => {
      toast.success(`Rule "${rule.keyword}" ${rule.is_active ? "enabled" : "disabled"}`);
      invalidate();
    },
    onError: onError("Could not change the rule status."),
  });
  const remove = useMutation({
    mutationFn: (rule: AutomationRule) => data.deleteRule(uid, rule),
    onSuccess: () => {
      toast.success("Rule deleted");
      invalidate();
    },
    onError: onError("Could not delete the rule."),
  });
  return { create, update, toggle, remove };
}

export function useComments() {
  const uid = useUserId();
  return useQuery({ queryKey: keys.comments(uid), enabled: !!uid, queryFn: () => data.listComments(uid) });
}

export function useReplies() {
  const uid = useUserId();
  return useQuery({ queryKey: keys.replies(uid), enabled: !!uid, queryFn: () => data.listReplies(uid) });
}

export function useActivity() {
  const uid = useUserId();
  return useQuery({ queryKey: keys.activity(uid), enabled: !!uid, queryFn: () => data.listActivity(uid) });
}

export function useDashboardStats() {
  const uid = useUserId();
  return useQuery({ queryKey: keys.stats(uid), enabled: !!uid, queryFn: () => data.getDashboardStats(uid) });
}
