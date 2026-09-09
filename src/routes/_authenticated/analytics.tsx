import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, subDays } from "date-fns";
import { useComments, useDashboardStats, useReplies } from "@/hooks/queries";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState, ErrorState, GlassCard, StatSkeleton } from "@/components/common/States";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Ashinsta" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const stats = useDashboardStats();
  const comments = useComments();
  const replies = useReplies();

  const daily = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      return {
        day: format(d, "EEE"),
        comments: (comments.data ?? []).filter((c) => c.created_at.startsWith(key)).length,
        replies: (replies.data ?? []).filter((r) => r.created_at.startsWith(key) && r.status !== "failed").length,
      };
    });
  }, [comments.data, replies.data]);

  if (stats.isError) return <ErrorState onRetry={() => stats.refetch()} />;
  const s = stats.data;
  const totalReplies = s ? s.repliesSent + s.repliesSimulated + s.repliesFailed : 0;
  const pie = s
    ? [
        { name: "Sent", value: s.repliesSent, color: "var(--mint)" },
        { name: "Simulated (Demo)", value: s.repliesSimulated, color: "var(--amber)" },
        { name: "Failed", value: s.repliesFailed, color: "var(--rose)" },
      ].filter((p) => p.value > 0)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Calculated live from your comments, replies and rules." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {!s ? Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} />) : (
          <>
            <StatCard label="Total comments" value={s.totalComments} />
            <StatCard label="Total replies" value={totalReplies} hint={s.repliesSimulated ? `${s.repliesSimulated} demo` : undefined} hintTone="amber" />
            <StatCard label="Successful replies" value={s.repliesSent + s.repliesSimulated} hintTone="mint" hint="sent + simulated" />
            <StatCard label="Failed replies" value={s.repliesFailed} hintTone={s.repliesFailed ? "rose" : "muted"} />
            <StatCard label="Reply rate" value={`${s.totalComments ? Math.round(((s.repliesSent + s.repliesSimulated) / s.totalComments) * 100) : 0}%`} hint="of comments answered" />
            <StatCard label="Active rules" value={s.activeRules} hint={`of ${s.totalRules}`} />
          </>
        )}
      </div>

      {s && s.totalComments === 0 ? (
        <EmptyState icon={BarChart3} title="No data yet" description="Charts appear once comments start coming in." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassCard className="p-4">
            <h2 className="font-display text-[15px] font-semibold">Last 7 days</h2>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }} />
                  <Bar dataKey="comments" name="Comments" fill="var(--brand)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="replies" name="Replies" fill="var(--mint)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <h2 className="font-display text-[15px] font-semibold">Reply outcomes</h2>
            {pie.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No replies yet.</p> : (
              <div className="mt-3 flex h-56 items-center gap-4">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {pie.map((p) => <Cell key={p.name} fill={p.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="space-y-2 text-sm">
                  {pie.map((p) => (
                    <li key={p.name} className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: p.color }} />{p.name}: <strong>{p.value}</strong></li>
                  ))}
                </ul>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}
