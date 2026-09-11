import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Instagram,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/queries";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/common/Logo";
import { AuroraBackground } from "@/components/common/AuroraBackground";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type NavPath =
  | "/dashboard"
  | "/instagram"
  | "/comments"
  | "/rules"
  | "/activity"
  | "/analytics"
  | "/settings";

interface NavItem {
  to: NavPath;
  label: string;
  short: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { to: "/instagram", label: "Instagram", short: "Instagram", icon: Instagram },
  { to: "/comments", label: "Comments", short: "Comments", icon: MessageSquare },
  { to: "/rules", label: "Automation Rules", short: "Rules", icon: Zap },
  { to: "/activity", label: "Activity", short: "Activity", icon: Activity },
  { to: "/analytics", label: "Analytics", short: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", short: "Settings", icon: Settings },
];

const BOTTOM_NAV: NavPath[] = ["/dashboard", "/comments", "/rules", "/activity"];

export function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };
}

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      activeProps={{ className: "bg-brand/10 text-brand hover:bg-brand/15 hover:text-brand" }}
    >
      <Icon className="size-4" aria-hidden />
      {item.label}
    </Link>
  );
}

function UserCard({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const name = profile?.full_name || (user?.user_metadata?.["full_name"] as string | undefined) || "Your account";
  const email = profile?.email || user?.email || "";
  return (
    <div className={cn("flex items-center gap-3", compact && "gap-2")}>
      <div
        className="grid size-9 shrink-0 place-items-center rounded-full bg-card text-[11px] font-semibold ring-1 ring-foreground/10"
        aria-hidden
      >
        {initials(name, "U")}
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-sm font-semibold">{name}</div>
        <div className="truncate text-[11px] text-muted-foreground">{email}</div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const signOut = useSignOut();
  const [sheetOpen, setSheetOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = NAV_ITEMS.find((n) => pathname.startsWith(n.to));

  return (
    <div className="min-h-screen font-sans text-foreground">
      <AuroraBackground />

      {/* Desktop sidebar */}
      <aside className="glass fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-y-0 border-l-0 p-4 lg:flex">
        <div className="flex items-center justify-between">
          <Logo to="/dashboard" />
        </div>
        <nav aria-label="Main" className="mt-6 flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} item={item} />
          ))}
        </nav>
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <UserCard />
          <Button variant="outline" className="w-full justify-start" onClick={signOut}>
            <LogOut aria-hidden />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile / tablet top bar */}
      <header className="glass sticky top-0 z-30 flex items-center justify-between border-x-0 border-t-0 px-4 py-3 lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2" aria-label="Dashboard">
          <LogoMark className="size-8 text-sm" />
          <span className="font-display text-[15px] font-bold tracking-tight">AshConnect</span>
        </Link>
        <div className="flex items-center gap-2">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="glass w-[85vw] max-w-sm border-y-0 border-r-0 p-0">
              <SheetHeader className="p-4 text-left">
                <SheetTitle className="font-display">Menu</SheetTitle>
              </SheetHeader>
              <div className="px-4">
                <UserCard />
              </div>
              <nav aria-label="Mobile" className="mt-4 flex flex-col gap-1 px-3">
                {NAV_ITEMS.map((item) => (
                  <NavLink key={item.to} item={item} onClick={() => setSheetOpen(false)} />
                ))}
              </nav>
              <div className="mt-4 px-4">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setSheetOpen(false);
                    signOut();
                  }}
                >
                  <LogOut aria-hidden />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:ml-64 lg:max-w-none lg:px-10 lg:pb-12 lg:pt-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Quick navigation"
        className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] lg:hidden"
      >
        <div className="glass mx-auto flex max-w-md items-center justify-between rounded-2xl px-2 py-2 shadow-float">
          {BOTTOM_NAV.map((to) => {
            const item = NAV_ITEMS.find((n) => n.to === to)!;
            const Icon = item.icon;
            const active = current?.to === to;
            return (
              <Link
                key={to}
                to={to}
                aria-label={item.label}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium text-muted-foreground transition-colors",
                  active && "font-semibold text-brand",
                )}
              >
                <Icon className="size-[18px]" aria-hidden />
                {item.short}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="More"
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium text-muted-foreground",
              current && !BOTTOM_NAV.includes(current.to) && "font-semibold text-brand",
            )}
          >
            <Menu className="size-[18px]" aria-hidden />
            More
          </button>
        </div>
      </nav>
    </div>
  );
}
