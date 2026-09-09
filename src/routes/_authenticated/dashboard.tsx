import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Instagram, MessageSquare, Zap } from "lucide-react";
import { useActivity, useComments, useDashboardStats, useInstagramAccount, useProfile } from "@/hooks/queries";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { CardSkeleton, EmptyState, ErrorState, GlassCard, StatSkeleton } from "@/components/common/States";
import { ActivityStatusDot, ReplyStatusBadge } from "@/components/common/StatusBadge";
import { DemoChip } from "@/components/common/DemoBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Ashinsta" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: profile } = useProfile();
  const stats = useDashboardStats();
  const account = useInstagramAccount();
  const activity = useActivity();
  const comments = useComments();
  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Welcome back" title={firstName ? `Hi, ${firstName}` : "Dashboard"} />

      {account.data && (
        <GlassCard className="flex items-center gap-3 p-4">
          <div className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-rose to-brand-2 font-display text-brand-foreground">@</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-display text-sm font-semibold">@{account.data.username}</span>
              <Badge variant="mint">Connected</Badge>
              {account.data.is_demo && <DemoChip />}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {stats.data ? `${stats.data.activeRules} active rules` : "Loading…"}
            </div>
          </div>
        </GlassCard>
      )}

      {stats.isError ? (
        <ErrorState onRetry={() => stats.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {stats.isPending ? (
            Array.from({ length: 5 }).map((_, i) => <StatSkeleton key={i} />)
          ) : (
            <>
              <StatCard label="Connected accounts" value={stats.data.connectedAccounts} hint={stats.data.connectedAccounts ? "Instagram" : "None yet"} />
              <StatCard label="Total comments" value={stats.data.totalComments} />
              <StatCard label="Replies sent" value={stats.data.repliesSent + stats.data.repliesSimulated} hint={stats.data.repliesSimulated ? `${stats.data.repliesSimulated} demo` : undefined} hintTone="amber" />
              <StatCard label="Active rules" value={stats.data.activeRules} hint={`of ${stats.data.totalRules} total`} />
              <StatCard label="Success rate" value={`${stats.data.successRate}%`} hint={stats.data.repliesFailed ? `${stats.data.repliesFailed} failed` : "No failures"} hintTone={stats.data.repliesFailed ? "rose" : "mint"} />
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button asChild variant="brand"><Link to="/instagram"><Instagram aria-hidden />Connect Instagram</Link></Button>
        <Button asChild variant="glass"><Link to="/rules" search={{ create: true }}><Zap aria-hidden />Create Rule</Link></Button>
        <Button asChild variant="glass"><Link to="/comments"><MessageSquare aria-hidden />View Comments</Link></Button>
        <Button asChild variant="glass"><Link to="/activity"><Activity aria-hidden />View Activity</Link></Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold">Recent activity</h2>
            <Link to="/activity" className="text-xs font-medium text-brand hover:underline">View all</Link>
          </div>
          {activity.isPending ? <CardSkeleton /> : activity.isError ? <ErrorState onRetry={() => activity.refetch()} /> : activity.data.length === 0 ? (
            <EmptyState icon={Activity} title="No activity yet" description="Connect Instagram or create a rule to get started." />
          ) : (
            <div className="space-y-2">
              {activity.data.slice(0, 5).map((a) => (
                <GlassCard key={a.id} className="flex items-center gap-3 p-3">
                  <ActivityStatusDot status={a.status} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{a.message}</div>
                    <div className="text-[10px] text-muted-foreground">{timeAgo(a.created_at)}</div>
                  </div>
                  {a.status === "demo" && <DemoChip />}
                </GlassCard>
              ))}
            </div>
          )}
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold">Recent comments</h2>
            <Link to="/comments" className="text-xs font-medium text-brand hover:underline">Manage</Link>
          </div>
          {comments.isPending ? <CardSkeleton /> : comments.isError ? <ErrorState onRetry={() => comments.refetch()} /> : comments.data.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No comments yet" description="In Demo Mode you can generate sample comments from the Comments page." />
          ) : (
            <div className="space-y-2">
              {comments.data.slice(0, 5).map((c) => (
                <GlassCard key={c.id} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">@{c.username}</span>
                    <ReplyStatusBadge status={c.comment_replies[0]?.status as never} replied={c.replied} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.comment_text}</p>
                </GlassCard>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
