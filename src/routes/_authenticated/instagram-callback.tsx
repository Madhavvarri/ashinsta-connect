import { useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useCompleteInstagramConnect } from "@/hooks/queries";
import { friendlyError } from "@/lib/format";
import { ErrorState, GlassCard } from "@/components/common/States";
import { Button } from "@/components/ui/button";

/** Meta redirects here after the user approves Instagram access. */
export const Route = createFileRoute("/_authenticated/instagram-callback")({
  validateSearch: (s) =>
    z
      .object({
        code: z.string().optional(),
        state: z.string().optional(),
        error: z.string().optional(),
        error_description: z.string().optional(),
        error_reason: z.string().optional(),
      })
      .passthrough()
      .parse(s),
  head: () => ({ meta: [{ title: "Connecting Instagram — AshConnect" }] }),
  component: InstagramCallbackPage,
});

function InstagramCallbackPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const complete = useCompleteInstagramConnect();
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !search.code) return;
    started.current = true;
    complete.mutate(
      { code: search.code, state: search.state ?? null },
      { onSuccess: () => navigate({ to: "/instagram", replace: true }) },
    );
  }, [search.code, search.state, complete, navigate]);

  if (search.error || !search.code) {
    return (
      <GlassCard className="p-6 text-center">
        <h1 className="font-display text-lg font-semibold">Instagram connection cancelled</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {search.error_description ?? "Meta did not return an authorization code. No account was connected."}
        </p>
        <Button asChild variant="brand" className="mt-4"><Link to="/instagram">Back to Instagram</Link></Button>
      </GlassCard>
    );
  }

  if (complete.isError) {
    return (
      <div className="space-y-3">
        <ErrorState title="Could not connect Instagram" description={friendlyError(complete.error, "Meta rejected the connection.")} />
        <div className="text-center"><Button asChild variant="brand"><Link to="/instagram">Try again</Link></Button></div>
      </div>
    );
  }

  return (
    <GlassCard className="flex flex-col items-center gap-3 p-8 text-center">
      <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
      <h1 className="font-display text-lg font-semibold">Connecting your Instagram account…</h1>
      <p className="text-sm text-muted-foreground">Verifying with Meta and enabling comment notifications.</p>
    </GlassCard>
  );
}
