import { Badge } from "@/components/ui/badge";
import { IS_DEMO } from "@/lib/config";
import { cn } from "@/lib/utils";

export function DemoBadge({ className, label = "Demo Mode" }: { className?: string; label?: string }) {
  if (!IS_DEMO) return null;
  return (
    <Badge variant="amber" className={cn("normal-case tracking-normal", className)} title="Simulated Instagram — no real replies are sent">
      <span className="size-1.5 rounded-full bg-amber" aria-hidden />
      {label}
    </Badge>
  );
}

/** Small inline "Demo" chip for individual simulated items. */
export function DemoChip({ className }: { className?: string }) {
  return (
    <Badge variant="amber" className={cn("px-1.5 py-0 text-[9px]", className)}>
      Demo
    </Badge>
  );
}
