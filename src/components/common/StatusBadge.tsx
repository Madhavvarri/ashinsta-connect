import { Badge } from "@/components/ui/badge";
import type { ActivityStatus, ReplyStatus } from "@/types";

export function ReplyStatusBadge({ status, replied }: { status?: ReplyStatus | null | undefined; replied: boolean }) {
  if (status === "sent") return <Badge variant="mint">Replied</Badge>;
  if (status === "failed") return <Badge variant="rose">Failed</Badge>;
  if (replied) return <Badge variant="mint">Replied</Badge>;
  return <Badge variant="muted">Not replied</Badge>;
}

export function ActivityStatusDot({ status }: { status: ActivityStatus | string }) {
  const color =
    status === "success" ? "bg-mint" : status === "error" ? "bg-rose" : status === "warning" ? "bg-amber" : "bg-brand";
  return <span aria-hidden className={`inline-block size-2 shrink-0 rounded-full ${color}`} />;
}

export function ActivityStatusBadge({ status }: { status: ActivityStatus | string }) {
  switch (status) {
    case "success":
      return <Badge variant="mint">Success</Badge>;
    case "error":
      return <Badge variant="rose">Failed</Badge>;
    case "warning":
      return <Badge variant="amber">Warning</Badge>;
    default:
      return <Badge variant="brand">Info</Badge>;
  }
}
