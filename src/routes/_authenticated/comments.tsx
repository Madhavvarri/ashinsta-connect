import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MessageSquare, Search, Sparkles } from "lucide-react";
import { useComments, useInstagramAccount } from "@/hooks/queries";
import { useDemoActions } from "@/hooks/useDemoActions";
import { IS_DEMO } from "@/lib/config";
import { formatDateTime } from "@/lib/format";
import { simulateCommentSchema, type SimulateCommentValues } from "@/lib/validation";
import type { CommentWithReply, ReplyStatus } from "@/types";
import { PageHeader } from "@/components/common/PageHeader";
import { CardSkeleton, EmptyState, ErrorState, GlassCard } from "@/components/common/States";
import { ReplyStatusBadge } from "@/components/common/StatusBadge";
import { DemoChip } from "@/components/common/DemoBadge";
import { FormField } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/comments")({
  head: () => ({ meta: [{ title: "Comments — Ashinsta" }] }),
  component: CommentsPage,
});

type Filter = "all" | "replied" | "not_replied";

function CommentsPage() {
  const comments = useComments();
  const account = useInstagramAccount();
  const demo = useDemoActions(account.data);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CommentWithReply | null>(null);

  const filtered = useMemo(() => {
    const list = comments.data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((c) => {
      if (filter === "replied" && !c.replied) return false;
      if (filter === "not_replied" && c.replied) return false;
      if (q && !c.username.toLowerCase().includes(q) && !c.comment_text.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [comments.data, filter, search]);

  const form = useForm<SimulateCommentValues>({
    resolver: zodResolver(simulateCommentSchema),
    defaultValues: { username: "", comment_text: "" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comments"
        description="Every comment received, with its reply status."
        actions={
          IS_DEMO && (
            <Button variant="brand" onClick={() => demo.generateSampleComments.mutate()} disabled={demo.generateSampleComments.isPending}>
              {demo.generateSampleComments.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
              Generate sample comments
            </Button>
          )
        }
      />

      {IS_DEMO && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-[15px] font-semibold">Simulate an incoming comment</h2>
            <DemoChip />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Runs the automation engine exactly like a webhook would — but nothing is sent to Instagram.</p>
          <form
            className="mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
            noValidate
            onSubmit={form.handleSubmit((v) => demo.simulateComment.mutate(v, { onSuccess: () => form.reset() }))}
          >
            <FormField label="Username" placeholder="maya.k" error={form.formState.errors.username?.message} {...form.register("username")} />
            <FormField label="Comment" placeholder="Can you tell me the price?" error={form.formState.errors.comment_text?.message} {...form.register("comment_text")} />
            <Button type="submit" variant="outline" className="h-11" disabled={demo.simulateComment.isPending}>
              {demo.simulateComment.isPending && <Loader2 className="animate-spin" aria-hidden />}
              Simulate
            </Button>
          </form>
        </GlassCard>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="glass">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="replied">Replied</TabsTrigger>
            <TabsTrigger value="not_replied">Not replied</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Search comments" placeholder="Search comments" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 rounded-xl bg-card/70 pl-9 sm:w-64" />
        </div>
      </div>

      {comments.isPending ? <CardSkeleton rows={5} /> : comments.isError ? <ErrorState onRetry={() => comments.refetch()} /> : filtered.length === 0 ? (
        <EmptyState icon={MessageSquare} title={comments.data.length === 0 ? "No comments yet" : "No matching comments"} description={comments.data.length === 0 ? (IS_DEMO ? "Generate sample comments to see the automation in action." : "Comments will appear here as they arrive from Instagram.") : "Try a different filter or search."} />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const reply = c.comment_replies[0];
            return (
              <button key={c.id} type="button" onClick={() => setSelected(c)} className="glass block w-full rounded-2xl p-4 text-left transition-colors hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">@{c.username}</span>
                    {c.is_demo && <DemoChip />}
                  </div>
                  <ReplyStatusBadge status={reply?.status as ReplyStatus | undefined} replied={c.replied} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{c.comment_text}</p>
                <div className="mt-2 flex flex-wrap gap-x-3 text-[10px] text-muted-foreground">
                  <span>Post {c.post_id || "—"}</span>
                  <span>{formatDateTime(c.created_at)}</span>
                  {reply && <span className="truncate">Reply: {reply.reply_text}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="glass rounded-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">@{selected.username} {selected.is_demo && <DemoChip />}</DialogTitle>
                <DialogDescription>{formatDateTime(selected.created_at)} · Post {selected.post_id || "—"}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="rounded-xl bg-card/70 p-3">{selected.comment_text}</div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <ReplyStatusBadge status={selected.comment_replies[0]?.status as ReplyStatus | undefined} replied={selected.replied} />
                </div>
                {selected.comment_replies.length > 0 ? (
                  selected.comment_replies.map((r) => (
                    <div key={r.id} className="rounded-xl border border-brand/20 bg-brand/5 p-3">
                      <div className="text-[10px] font-semibold uppercase text-brand">{r.status === "simulated" ? "Simulated reply (Demo)" : r.status === "sent" ? "Reply sent" : "Reply failed"}</div>
                      <p className="mt-1">{r.reply_text}</p>
                      {r.error_message && <p className="mt-1 text-xs text-rose">{r.error_message}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No rule matched this comment.</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
