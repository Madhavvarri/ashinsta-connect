import type { ReactNode } from "react";
import { GlassCard } from "@/components/common/States";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  hintTone = "muted",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  hintTone?: "muted" | "mint" | "brand" | "amber" | "rose";
  className?: string;
}) {
  const tone = {
    muted: "text-muted-foreground font-medium",
    mint: "text-mint font-semibold",
    brand: "text-brand font-semibold",
    amber: "text-amber font-semibold",
    rose: "text-rose font-semibold",
  }[hintTone];
  return (
    <GlassCard className={cn("p-4 animate-fade-up", className)}>
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-[26px] font-bold tracking-tight">{value}</div>
      {hint && <div className={cn("mt-1 text-[10px]", tone)}>{hint}</div>}
    </GlassCard>
  );
}
