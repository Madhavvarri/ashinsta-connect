import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Search } from "lucide-react";
import { useComments } from "@/hooks/queries";
import { formatDateTime } from "@/lib/format";
import type { CommentWithReply, ReplyStatus } from "@/types";
import { PageHeader } from "@/components/common/PageHeader";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/common/States";
import { ReplyStatusBadge } from "@/components/common/StatusBadge";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comments"
        description="Every comment received, with its reply status."
      />

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
        <EmptyState icon={MessageSquare} title={comments.data.length === 0 ? "No comments yet" : "No matching comments"} description={comments.data.length === 0 ? "Comments will appear here as they arrive from Instagram." : "Try a different filter or search."} />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const reply = c.comment_replies[0];
            return (
              <button key={c.id} type="button" onClick={() => setSelected(c)} className="glass block w-full rounded-2xl p-4 text-left transition-colors hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">@{c.username}</span>
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
                <DialogTitle className="flex items-center gap-2">@{selected.username}</DialogTitle>
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
                      <div className="text-[10px] font-semibold uppercase text-brand">{r.status === "sent" ? "Reply sent" : "Reply failed"}</div>
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
