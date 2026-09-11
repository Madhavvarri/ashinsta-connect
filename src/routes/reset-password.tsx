import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/validation";
import { friendlyError } from "@/lib/format";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormField } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — AshConnect" },
      { name: "description", content: "Choose a new password for your AshConnect account." },
      { property: "og:title", content: "Set a new password — AshConnect" },
      { property: "og:description", content: "Choose a new password for your AshConnect account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const isRecovery = hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady("ok");
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (isRecovery || s.session) setReady("ok");
      else setReady("invalid");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const { register, handleSubmit, formState } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    setServerError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setServerError(friendlyError(error, "Could not update your password."));
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/dashboard", replace: true });
  });

  return (
    <AuthCard title="Set a new password" description="Choose something at least 8 characters long.">
      {ready === "checking" ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Verifying your link…
        </div>
      ) : ready === "invalid" ? (
        <div className="space-y-4">
          <p role="alert" className="rounded-xl bg-rose/10 px-3 py-2 text-sm font-medium text-rose">
            This reset link is invalid or has expired.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField
            label="New password"
            type="password"
            autoComplete="new-password"
            error={formState.errors.password?.message}
            {...register("password")}
          />
          <FormField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={formState.errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          {serverError && (
            <p role="alert" className="rounded-xl bg-rose/10 px-3 py-2 text-sm font-medium text-rose">
              {serverError}
            </p>
          )}
          <Button type="submit" variant="brand" size="lg" className="w-full" disabled={formState.isSubmitting}>
            {formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
            Update password
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
