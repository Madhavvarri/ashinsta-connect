import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { loginSchema, type LoginValues } from "@/lib/validation";
import { friendlyError } from "@/lib/format";
import { AuthCard } from "@/components/auth/AuthCard";
import { FormField } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const PROTECTED = ["/dashboard", "/instagram", "/comments", "/rules", "/activity", "/analytics", "/settings"];

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/login")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Login — Ashinsta" },
      { name: "description", content: "Log in to Ashinsta to manage your Instagram comment automation." },
      { property: "og:title", content: "Login — Ashinsta" },
      { property: "og:description", content: "Log in to manage your Instagram comment automation." },
    ],
  }),
  component: LoginPage,
});

function safeRedirect(value: string | undefined): string {
  if (value && PROTECTED.some((p) => value === p || value.startsWith(p + "/"))) return value;
  return "/dashboard";
}

function LoginPage() {
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [serverError, setServerError] = useState<string | null>(null);

  // Already signed in? Don't show the login form again.
  useEffect(() => {
    if (!loading && user) navigate({ to: safeRedirect(redirect), replace: true });
  }, [loading, user, navigate, redirect]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });
  const { register, handleSubmit, formState, setValue, watch } = form;
  const remember = watch("remember");

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const { error } = await signIn(values.email, values.password);
    if (error) {
      setServerError(friendlyError(error, "Could not log in. Please try again."));
      return;
    }
    if (!values.remember && typeof window !== "undefined") {
      // "Remember me" off: clear the persisted session when the tab closes.
      window.addEventListener("pagehide", () => {
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith("sb-") && k.endsWith("-auth-token"))
          .forEach((k) => window.localStorage.removeItem(k));
      });
    }
    navigate({ to: safeRedirect(redirect), replace: true });
  });

  return (
    <AuthCard
      title="Welcome back"
      description="Log in to manage your automations."
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-brand hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
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
          autoComplete="current-password"
          placeholder="••••••••"
          error={formState.errors.password?.message}
          {...register("password")}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={remember}
              onCheckedChange={(v) => setValue("remember", v === true)}
            />
            <Label htmlFor="remember" className="text-sm font-normal">
              Remember me
            </Label>
          </div>
          <Link to="/forgot-password" className="text-sm font-medium text-brand hover:underline">
            Forgot password?
          </Link>
        </div>
        {serverError && (
          <p role="alert" className="rounded-xl bg-rose/10 px-3 py-2 text-sm font-medium text-rose">
            {serverError}
          </p>
        )}
        <Button type="submit" variant="brand" size="lg" className="w-full" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          Log in
        </Button>
      </form>
    </AuthCard>
  );
}
