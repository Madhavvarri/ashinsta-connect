import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Instagram, Loader2 } from "lucide-react";
import { useConnectDemoInstagram, useDisconnectInstagram, useInstagramAccount } from "@/hooks/queries";
import { IS_DEMO } from "@/lib/config";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/common/PageHeader";
import { CardSkeleton, ErrorState, GlassCard } from "@/components/common/States";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DemoChip } from "@/components/common/DemoBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/instagram")({
  head: () => ({ meta: [{ title: "Instagram — Ashinsta" }] }),
  component: InstagramPage,
});

const PERMISSIONS = [
  "instagram_business_basic — read your profile and media",
  "instagram_business_manage_comments — read and reply to comments",
  "instagram_business_manage_messages — (optional) reply in DMs",
];

function InstagramPage() {
  const account = useInstagramAccount();
  const connect = useConnectDemoInstagram();
  const disconnect = useDisconnectInstagram();
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="Instagram" description="Connect the professional account whose comments you want to automate." />

      {account.isPending ? <CardSkeleton /> : account.isError ? <ErrorState onRetry={() => account.refetch()} /> : account.data ? (
        <GlassCard className="p-5">
          <div className="flex items-center gap-4">
            {account.data.profile_picture ? (
              <img src={account.data.profile_picture} alt="" className="size-14 rounded-full object-cover" />
            ) : (
              <div className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-rose to-brand-2 font-display text-xl text-brand-foreground">@</div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-lg font-semibold">@{account.data.username}</span>
                <Badge variant="mint">Connected</Badge>
                {account.data.is_demo && <DemoChip />}
              </div>
              <p className="text-sm text-muted-foreground">Connected on {formatDate(account.data.created_at)}</p>
              {account.data.is_demo && (
                <p className="mt-1 text-xs text-amber">Simulated connection — no real Instagram account is linked.</p>
              )}
            </div>
          </div>
          <div className="mt-5">
            <Button variant="destructive" onClick={() => setConfirm(true)} disabled={disconnect.isPending}>
              {disconnect.isPending && <Loader2 className="animate-spin" aria-hidden />}
              Disconnect
            </Button>
          </div>
          <ConfirmDialog
            open={confirm}
            onOpenChange={setConfirm}
            title="Disconnect Instagram?"
            description="Automation will stop for this account. Your rules and history are kept."
            confirmLabel="Disconnect"
            destructive
            loading={disconnect.isPending}
            onConfirm={() => disconnect.mutate(account.data!, { onSuccess: () => setConfirm(false) })}
          />
        </GlassCard>
      ) : (
        <GlassCard className="p-6 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand/10 text-brand">
            <Instagram className="size-7" aria-hidden />
          </div>
          <h2 className="mt-4 font-display text-lg font-semibold">Not connected</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Ashinsta uses only the official Meta / Instagram API. We never ask for your Instagram password and never scrape Instagram.
          </p>
          {IS_DEMO ? (
            <div className="mt-5 space-y-3">
              <Button variant="brand" size="lg" onClick={() => connect.mutate()} disabled={connect.isPending}>
                {connect.isPending && <Loader2 className="animate-spin" aria-hidden />}
                Connect Demo Instagram
              </Button>
              <p className="text-xs text-amber">
                Demo Mode: this creates a simulated account so you can test the whole app. No real connection is made.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <Button variant="brand" size="lg" disabled title="Meta app credentials required">
                Connect Instagram
              </Button>
              <p className="text-xs text-muted-foreground">
                Production mode requires Meta app credentials (META_APP_SECRET, verify token) and an approved Instagram app. Add them, then enable the official Meta login.
              </p>
            </div>
          )}
        </GlassCard>
      )}

      <GlassCard className="p-5">
        <h2 className="font-display text-[15px] font-semibold">Permissions we'll request</h2>
        <p className="mt-1 text-sm text-muted-foreground">Through Meta's official login for Instagram professional accounts:</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {PERMISSIONS.map((p) => (
            <li key={p} className="flex gap-2"><span className="text-brand">•</span><span className="text-muted-foreground">{p}</span></li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}
