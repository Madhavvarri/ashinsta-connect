import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Instagram, Loader2, MessagesSquare, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyError, formatDateTime } from "@/lib/format";
import { getConversationMessages, getInstagramConversations, sendInstagramMessage } from "@/lib/messaging.functions";
import { PageHeader } from "@/components/common/PageHeader";
import { CardSkeleton, EmptyState, ErrorState, GlassCard } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — AshConnect" }] }),
  component: MessagesPage,
});

function StatusCard({ status }: { status: "not_connected" | "not_configured" | "needs_review" }) {
  if (status === "needs_review") {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Requires Meta App Review"
        description="Direct messages need the instagram_business_manage_messages permission. Submit it for Meta App Review, then reconnect your Instagram account — real conversations will appear here as soon as it's approved."
        action={
          <Button asChild variant="outline">
            <Link to="/instagram">Reconnect Instagram</Link>
          </Button>
        }
      />
    );
  }
  if (status === "not_connected") {
    return (
      <EmptyState
        icon={Instagram}
        title="No Instagram account connected"
        description="Connect your Instagram professional account to see and reply to direct messages."
        action={
          <Button asChild variant="brand">
            <Link to="/instagram">Connect Instagram</Link>
          </Button>
        }
      />
    );
  }
  return (
    <EmptyState
      icon={ShieldCheck}
      title="Instagram setup required"
      description="Your Meta app credentials are not configured yet, so messages cannot be loaded."
      action={
        <Button asChild variant="outline">
          <Link to="/instagram">Review setup</Link>
        </Button>
      }
    />
  );
}

function MessagesPage() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const qc = useQueryClient();
  const fetchConversations = useServerFn(getInstagramConversations);
  const fetchMessages = useServerFn(getConversationMessages);
  const send = useServerFn(sendInstagramMessage);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const conversations = useQuery({
    queryKey: ["ig-conversations", uid],
    enabled: !!uid,
    queryFn: () => fetchConversations(),
  });

  const list = conversations.data?.conversations ?? [];
  const selected = list.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && list.length > 0) setSelectedId(list[0]!.id);
  }, [list, selectedId]);

  const thread = useQuery({
    queryKey: ["ig-thread", uid, selectedId],
    enabled: !!uid && !!selectedId,
    queryFn: () => fetchMessages({ data: { conversationId: selectedId! } }),
  });

  const reply = useMutation({
    mutationFn: async (text: string) => {
      if (!selected?.participantId) throw new Error("This conversation has no recipient to reply to.");
      return send({ data: { recipientId: selected.participantId, text, conversationId: selected.id } });
    },
    onSuccess: (r) => {
      if (r.status === "needs_review") {
        toast.error("Messaging needs Meta App Review before replies can be sent.");
        return;
      }
      setDraft("");
      toast.success("Message sent");
      qc.invalidateQueries({ queryKey: ["ig-thread", uid, selectedId] });
      qc.invalidateQueries({ queryKey: ["ig-conversations", uid] });
      qc.invalidateQueries({ queryKey: ["activity", uid] });
    },
    onError: (e) => toast.error(friendlyError(e, "Could not send the message.")),
  });

  const status = conversations.data?.status;

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" description="Your Instagram direct message conversations, with replies sent through the official API." />

      {conversations.isPending ? (
        <CardSkeleton rows={5} />
      ) : conversations.isError ? (
        <ErrorState title="Couldn't load your messages" description={friendlyError(conversations.error, "Instagram did not return your conversations.")} onRetry={() => conversations.refetch()} />
      ) : status && status !== "ok" ? (
        <StatusCard status={status} />
      ) : list.length === 0 ? (
        <EmptyState icon={MessagesSquare} title="No conversations yet" description="New Instagram direct messages will appear here as they arrive." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* Conversation list */}
          <GlassCard className="max-h-[70vh] overflow-y-auto p-2">
            <ul className="space-y-1">
              {list.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      "w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selectedId === c.id && "bg-brand/10",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">@{c.participantUsername}</span>
                      {c.updatedTime && (
                        <span className="shrink-0 text-[10px] text-muted-foreground">{formatDateTime(c.updatedTime)}</span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.snippet || "No messages yet"}</p>
                  </button>
                </li>
              ))}
            </ul>
          </GlassCard>

          {/* Thread */}
          <GlassCard className="flex max-h-[70vh] flex-col p-0">
            <div className="border-b border-border px-4 py-3">
              <span className="font-display text-[15px] font-semibold">
                {selected ? `@${selected.participantUsername}` : "Select a conversation"}
              </span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {thread.isPending && selectedId ? (
                <CardSkeleton rows={4} />
              ) : thread.isError ? (
                <ErrorState title="Couldn't load this conversation" description={friendlyError(thread.error, "Instagram did not return these messages.")} onRetry={() => thread.refetch()} />
              ) : thread.data?.status && thread.data.status !== "ok" ? (
                <StatusCard status={thread.data.status} />
              ) : (thread.data?.messages ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No messages in this conversation yet.</p>
              ) : (
                (thread.data?.messages ?? []).map((m) => (
                  <div key={m.id} className={cn("flex", m.outgoing ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                        m.outgoing ? "bg-brand/15 text-foreground" : "bg-card/70",
                      )}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      {m.createdTime && (
                        <div className="mt-1 text-[10px] text-muted-foreground">{formatDateTime(m.createdTime)}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form
              className="flex items-center gap-2 border-t border-border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const text = draft.trim();
                if (text) reply.mutate(text);
              }}
            >
              <Input
                aria-label="Message"
                placeholder={selected ? `Reply to @${selected.participantUsername}` : "Select a conversation"}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!selected?.participantId || reply.isPending}
                maxLength={1000}
                className="h-11 rounded-xl bg-card/70"
              />
              <Button type="submit" variant="brand" className="h-11" disabled={!draft.trim() || !selected?.participantId || reply.isPending}>
                {reply.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
                Send
              </Button>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
