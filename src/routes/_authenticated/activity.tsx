import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Search } from "lucide-react";
import { useActivity } from "@/hooks/queries";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/common/PageHeader";
import { CardSkeleton, EmptyState, ErrorState, GlassCard } from "@/components/common/States";
import { ActivityStatusBadge, ActivityStatusDot } from "@/components/common/StatusBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({ meta: [{ title: "Activity — Ashinsta" }] }),
  component: ActivityPage,
});

const TYPE_GROUPS: Record<string, string[]> = {
  all: [],
  rules: ["rule_created", "rule_updated", "rule_deleted", "rule_enabled", "rule_disabled"],
  comments: ["comment_received"],
  replies: ["reply_sent", "reply_failed", "reply_skipped"],
  instagram: ["instagram_connected", "instagram_disconnected"],
  account: ["profile_updated", "settings_updated"],
};

function ActivityPage() {
  const activity = useActivity();
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (activity.data ?? []).filter((a) => {
      if (group !== "all" && !TYPE_GROUPS[group]!.includes(a.type)) return false;
      if (status !== "all" && a.status !== status) return false;
      if (q && !a.message.toLowerCase().includes(q) && !a.type.includes(q)) return false;
      return true;
    });
  }, [activity.data, search, group, status]);

  return (
    <div className="space-y-6">
      <PageHeader title="Activity" description="A complete history of everything Ashinsta did." />
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Search activity" placeholder="Search activity" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 rounded-xl bg-card/70 pl-9" />
        </div>
        <Select value={group} onValueChange={setGroup}>
          <SelectTrigger aria-label="Filter by type" className="h-10 rounded-xl bg-card/70 sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="rules">Rules</SelectItem>
            <SelectItem value="comments">Comments</SelectItem>
            <SelectItem value="replies">Replies</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="account">Account</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Filter by status" className="h-10 rounded-xl bg-card/70 sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {activity.isPending ? <CardSkeleton rows={6} /> : activity.isError ? <ErrorState onRetry={() => activity.refetch()} /> : filtered.length === 0 ? (
        <EmptyState icon={Activity} title={activity.data.length === 0 ? "No activity yet" : "Nothing matches"} description={activity.data.length === 0 ? "Actions like creating rules or receiving comments will show up here." : "Try a different search or filter."} />
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <GlassCard key={a.id} className="flex items-center gap-3 p-3">
              <ActivityStatusDot status={a.status} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{a.message}</div>
                <div className="text-[10px] text-muted-foreground">{formatDateTime(a.created_at)} · {a.type.replace(/_/g, " ")}</div>
              </div>
              <ActivityStatusBadge status={a.status} />
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
