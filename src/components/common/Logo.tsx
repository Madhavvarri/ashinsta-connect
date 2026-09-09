import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/config";

export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-xl bg-brand-gradient font-display text-base font-bold text-brand-foreground shadow-brand",
        className,
      )}
    >
      A
    </div>
  );
}

export function Logo({ to = "/", subtitle = "Auto-replies for Instagram" }: { to?: "/" | "/dashboard"; subtitle?: string | null }) {
  return (
    <Link to={to} className="flex items-center gap-2" aria-label={`${APP_NAME} home`}>
      <LogoMark />
      <div className="leading-tight">
        <div className="font-display text-[15px] font-bold tracking-tight">{APP_NAME}</div>
        {subtitle && <div className="text-[10px] font-medium text-muted-foreground">{subtitle}</div>}
      </div>
    </Link>
  );
}
