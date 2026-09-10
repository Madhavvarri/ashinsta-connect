import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, MessageSquare, ShieldCheck, Zap } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { AuroraBackground } from "@/components/common/AuroraBackground";
import { GlassCard } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} — ${APP_TAGLINE}` },
      { name: "description", content: "Ashinsta replies to Instagram comments automatically with keyword rules you control." },
      { property: "og:title", content: `${APP_NAME} — ${APP_TAGLINE}` },
      { property: "og:description", content: "Reply to Instagram comments automatically with keyword rules you control." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Zap, title: "Keyword rules", text: "Match comments by contains, exact, starts-with or ends-with — with case sensitivity and cooldowns." },
  { icon: MessageSquare, title: "Automatic replies", text: "Reply instantly with your own message, consistently, on every post." },
  { icon: Activity, title: "Full activity log", text: "Every match, reply and change is recorded so you always know what happened." },
  { icon: ShieldCheck, title: "Official API only", text: "Built for the official Meta / Instagram API. No scraping, never your password." },
];

const STEPS = [
  { n: "1", title: "Connect Instagram", text: "Link your professional account through Meta's official login." },
  { n: "2", title: "Create rules", text: "Pick a keyword like “price” and write the reply you want to send." },
  { n: "3", title: "Relax", text: "New comments are matched and answered automatically. Review everything in Activity." },
];

function Landing() {
  return (
    <div className="relative min-h-screen">
      <AuroraBackground />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Logo />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild variant="brand">
            <Link to="/register">Get Started</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <section className="py-16 text-center sm:py-24">
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl animate-fade-up">
            Automate Instagram conversations. <span className="text-brand-gradient">Grow engagement.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            {APP_NAME} replies to comments the moment they land, using keyword rules you control — so you can
            spend less time in the inbox and more time creating.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="brand" size="lg">
              <Link to="/register">Get Started</Link>
            </Button>
            <Button asChild variant="glass" size="lg">
              <Link to="/login">Login</Link>
            </Button>
          </div>
        </section>

        <section aria-labelledby="features" className="py-10">
          <h2 id="features" className="text-center font-display text-2xl font-bold">Everything you need</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <GlassCard key={f.title} className="p-5">
                <div className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">
                  <f.icon className="size-5" aria-hidden />
                </div>
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        <section aria-labelledby="how" className="py-10">
          <h2 id="how" className="text-center font-display text-2xl font-bold">How it works</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <GlassCard key={s.n} className="p-5">
                <div className="grid size-8 place-items-center rounded-lg bg-brand-gradient font-display text-sm font-bold text-brand-foreground">{s.n}</div>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        <section aria-labelledby="benefits" className="py-10">
          <GlassCard className="p-6 sm:p-8">
            <h2 id="benefits" className="font-display text-2xl font-bold">Why creators use {APP_NAME}</h2>
            <ul className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              <li>• Answer common questions (price, shipping, sizes) in seconds</li>
              <li>• Cooldowns stop you from spamming the same reply</li>
              <li>• Built-in rule tester to preview matches before going live</li>
              <li>• Private by design — only you can see your data</li>
            </ul>
          </GlassCard>
        </section>

        <section aria-labelledby="pricing" className="py-10">
          <h2 id="pricing" className="text-center font-display text-2xl font-bold">Simple pricing</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <GlassCard className="p-6">
              <div className="text-sm font-semibold text-muted-foreground">Starter</div>
              <div className="mt-2 font-display text-4xl font-bold">Free</div>
              <p className="mt-2 text-sm text-muted-foreground">1 Instagram account · 5 rules · full activity log</p>
              <Button asChild variant="outline" className="mt-5 w-full"><Link to="/register">Start free</Link></Button>
            </GlassCard>
            <GlassCard className="border-brand/30 p-6">
              <div className="text-sm font-semibold text-brand">Pro</div>
              <div className="mt-2 font-display text-4xl font-bold">$19<span className="text-base font-medium text-muted-foreground">/mo</span></div>
              <p className="mt-2 text-sm text-muted-foreground">Unlimited rules · analytics · priority support</p>
              <Button asChild variant="brand" className="mt-5 w-full"><Link to="/register">Get Started</Link></Button>
            </GlassCard>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-10 text-sm text-muted-foreground sm:flex-row">
        <Logo subtitle={null} />
        <p>© {new Date().getFullYear()} {APP_NAME}. Uses only the official Meta / Instagram API.</p>
      </footer>
    </div>
  );
}
