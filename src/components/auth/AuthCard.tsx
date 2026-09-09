import type { ReactNode } from "react";
import { Logo } from "@/components/common/Logo";
import { AuroraBackground } from "@/components/common/AuroraBackground";
import { DemoBadge } from "@/components/common/DemoBadge";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <AuroraBackground />
      <div className="mb-6 flex w-full max-w-md items-center justify-between">
        <Logo />
        <DemoBadge />
      </div>
      <div className="glass w-full max-w-md rounded-2xl p-6 sm:p-8 animate-fade-up">
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
    </div>
  );
}
