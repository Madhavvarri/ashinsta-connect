import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Instagram, Loader2 } from "lucide-react";
import { useConnectInstagram, useDisconnectInstagram, useInstagramAccount, useInstagramSetupStatus } from "@/hooks/queries";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/common/PageHeader";
import { CardSkeleton, ErrorState, GlassCard } from "@/components/common/States";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/instagram")({
  head: () => ({ meta: [{ title: "Instagram — Ashinsta" }] }),
  component: InstagramPage,
});

const PERMISSIONS = [
  "instagram_business_basic — read your profile and media",
  "instagram_business_manage_comments — read and reply to comments",
];

function InstagramPage() {
  const account = useInstagramAccount();
  const setup = useInstagramSetupStatus();
  const connect = useConnectInstagram();
  const disconnect = useDisconnectInstagram();
  const [confirm, setConfirm] = useState(false);
  const configured = setup.data?.configured ?? false;
  const tokenExpired = account.data?.token_expires_at ? new Date(account.data.token_expires_at) < new Date() : false;

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
                {tokenExpired ? <Badge variant="amber">Reconnect needed</Badge> : <Badge variant="mint">Connected</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">Connected on {formatDate(account.data.created_at)}</p>
              {account.data.token_expires_at && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Access {tokenExpired ? "expired" : "valid until"} {formatDate(account.data.token_expires_at)}
                </p>
              )}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {tokenExpired && (
              <Button variant="brand" onClick={() => connect.mutate()} disabled={connect.isPending || !configured}>
                {connect.isPending && <Loader2 className="animate-spin" aria-hidden />}
                Reconnect Instagram
              </Button>
            )}
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
          <div className="mt-5 space-y-3">
            <Button variant="brand" size="lg" onClick={() => connect.mutate()} disabled={connect.isPending || setup.isPending || !configured}>
              {connect.isPending || setup.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Instagram aria-hidden />}
              Connect Instagram
            </Button>
            <p className="text-xs text-muted-foreground">You'll be taken to Instagram to approve access, then brought straight back here.</p>
          </div>
        </GlassCard>
      )}

      {setup.data && !setup.data.configured && (
        <GlassCard className="border-amber/30 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber" aria-hidden />
            <div className="text-sm">
              <h2 className="font-display text-[15px] font-semibold">Meta app setup required</h2>
              <p className="mt-1 text-muted-foreground">
                Connecting Instagram needs your Meta app credentials stored as server secrets. Missing:
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {setup.data.missing.map((m) => (
                  <li key={m}><Badge variant="amber" className="font-mono normal-case tracking-normal">{m}</Badge></li>
                ))}
              </ul>
              <p className="mt-3 text-muted-foreground">
                In the Meta developer dashboard, add the Instagram product ("API setup with Instagram login"), then set this
                redirect URI and webhook callback URL:
              </p>
              <ul className="mt-2 space-y-1 font-mono text-xs">
                <li>Redirect URI: {typeof window !== "undefined" ? `${window.location.origin}/instagram-callback` : "/instagram-callback"}</li>
                <li>Webhook URL: {typeof window !== "undefined" ? `${window.location.origin}/api/public/webhooks/instagram` : "/api/public/webhooks/instagram"}</li>
              </ul>
            </div>
          </div>
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
