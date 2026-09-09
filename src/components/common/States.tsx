import type { ReactNode } from "react";
import { AlertTriangle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function GlassCard({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("glass rounded-2xl", className)} {...rest}>
      {children}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <GlassCard className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <div className="grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand">
        <Icon className="size-6" aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </GlassCard>
  );
}

export function ErrorState({
  title = "Couldn't load this",
  description = "Something went wrong while loading your data.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <GlassCard role="alert" className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      <div className="grid size-12 place-items-center rounded-2xl bg-rose/15 text-rose">
        <AlertTriangle className="size-6" aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </GlassCard>
  );
}

export function CardSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <GlassCard className={cn("space-y-3 p-4", className)} aria-busy>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </GlassCard>
  );
}

export function StatSkeleton() {
  return (
    <GlassCard className="p-4" aria-busy>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-16" />
      <Skeleton className="mt-2 h-3 w-20" />
    </GlassCard>
  );
}
