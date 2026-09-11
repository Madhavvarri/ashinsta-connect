import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { registerSchema, type RegisterValues } from "@/lib/validation";
import { friendlyError } from "@/lib/format";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormField } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — AshConnect" },
      { name: "description", content: "Create your free AshConnect account and start automating Instagram comment replies." },
      { property: "og:title", content: "Create account — AshConnect" },
      { property: "og:description", content: "Start automating Instagram comment replies in minutes." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  const { register, handleSubmit, formState } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const { error } = await signUp(values.fullName, values.email, values.password);
    if (error) {
      setServerError(friendlyError(error, "Could not create your account. Please try again."));
      return;
    }
    // With auto-confirm enabled a session arrives via onAuthStateChange and the
    // effect above redirects. If confirmation is required instead, tell the user.
    setPendingConfirm(true);
  });

  return (
    <AuthCard
      title="Create your account"
      description="Free to start. No credit card required."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {pendingConfirm && !user ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-brand/10 px-4 py-3 text-sm">
            <p className="font-semibold">Almost there</p>
            <p className="mt-1 text-muted-foreground">
              Signing you in… If nothing happens, check your inbox for a confirmation email, then log in.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">Go to login</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField
            label="Full name"
            autoComplete="name"
            placeholder="Dana Rivera"
            error={formState.errors.fullName?.message}
            {...register("fullName")}
          />
          <FormField
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={formState.errors.email?.message}
            {...register("email")}
          />
          <FormField
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={formState.errors.password?.message}
            {...register("password")}
          />
          <FormField
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
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
            Create account
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
