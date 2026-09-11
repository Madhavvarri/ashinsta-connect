import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile } from "@/hooks/queries";
import { useTheme, type ThemePreference } from "@/hooks/useTheme";
import { useSignOut } from "@/components/layout/AppShell";
import { deleteOwnAccount } from "@/lib/account.functions";
import { friendlyError } from "@/lib/format";
import { profileSchema, type ProfileValues } from "@/lib/validation";
import { PageHeader } from "@/components/common/PageHeader";
import { CardSkeleton, ErrorState, GlassCard } from "@/components/common/States";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FormField } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — AshConnect" }] }),
  component: SettingsPage,
});

const THEMES: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function SettingsPage() {
  const { user } = useAuth();
  const profile = useProfile();
  const update = useUpdateProfile();
  const { theme, setTheme } = useTheme();
  const signOut = useSignOut();
  const deleteAccount = useServerFn(deleteOwnAccount);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: { full_name: "" } });
  useEffect(() => {
    if (profile.data) form.reset({ full_name: profile.data.full_name });
  }, [profile.data, form]);

  const onDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      toast.success("Your account has been deleted");
      await signOut();
    } catch (e) {
      toast.error(friendlyError(e, "Could not delete your account."));
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your profile, appearance and automation preferences." />

      <GlassCard className="p-5">
        <h2 className="font-display text-[15px] font-semibold">Profile</h2>
        {profile.isPending ? <CardSkeleton rows={1} className="mt-3" /> : profile.isError ? <ErrorState onRetry={() => profile.refetch()} className="mt-3" /> : (
          <form className="mt-3 space-y-4" noValidate onSubmit={form.handleSubmit((v) => update.mutate(v, { onSuccess: () => toast.success("Profile saved") }))}>
            <FormField label="Full name" error={form.formState.errors.full_name?.message} {...form.register("full_name")} />
            <FormField label="Email" value={profile.data.email || user?.email || ""} readOnly disabled hint="Email is used to log in and cannot be changed here." />
            <Button type="submit" variant="brand" disabled={update.isPending || !form.formState.isDirty}>
              {update.isPending && <Loader2 className="animate-spin" aria-hidden />}
              Save changes
            </Button>
          </form>
        )}
      </GlassCard>

      <GlassCard className="p-5">
        <h2 className="font-display text-[15px] font-semibold">Appearance</h2>
        <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <button key={t.value} type="button" role="radio" aria-checked={theme === t.value} onClick={() => setTheme(t.value)} className={cn("flex flex-col items-center gap-1.5 rounded-xl border bg-card/60 px-3 py-3 text-sm font-medium transition-colors hover:bg-accent", theme === t.value && "border-brand bg-brand/10 text-brand")}>
              <t.icon className="size-4" aria-hidden />{t.label}
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h2 className="font-display text-[15px] font-semibold">Automation</h2>
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-card/50 px-3 py-2.5">
            <div>
              <Label htmlFor="default_active">New rules start active</Label>
              <p className="text-xs text-muted-foreground">Default status when you create a rule.</p>
            </div>
            <Switch id="default_active" checked={profile.data?.default_automation_active ?? true} disabled={!profile.data || update.isPending} onCheckedChange={(v) => update.mutate({ default_automation_active: v })} />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-card/50 px-3 py-2.5">
            <div>
              <Label htmlFor="notifications">Notifications</Label>
              <p className="text-xs text-muted-foreground">Show in-app notifications for automation events.</p>
            </div>
            <Switch id="notifications" checked={profile.data?.notifications_enabled ?? true} disabled={!profile.data || update.isPending} onCheckedChange={(v) => update.mutate({ notifications_enabled: v })} />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <h2 className="font-display text-[15px] font-semibold">Account</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={signOut}><LogOut aria-hidden />Logout</Button>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>Delete account</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Deleting your account removes all rules, comments and history permanently.</p>
      </GlassCard>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete your account?"
        description="This permanently deletes your account and all of your data. This cannot be undone."
        confirmLabel="Delete my account"
        destructive
        loading={deleting}
        onConfirm={onDelete}
      />
    </div>
  );
}
