import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FlaskConical, Loader2, Pencil, Plus, Trash2, Zap } from "lucide-react";
import { z } from "zod";
import { useInstagramAccount, useReplies, useRuleMutations, useRules } from "@/hooks/queries";
import { ruleSchema, type RuleValues } from "@/lib/validation";
import { evaluateRules, selectRule } from "@/services/automation/matcher";
import { MATCH_TYPE_LABELS, type AutomationRule, type MatchType } from "@/types";
import { PageHeader } from "@/components/common/PageHeader";
import { CardSkeleton, EmptyState, ErrorState, GlassCard } from "@/components/common/States";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FormField } from "@/components/auth/FormField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/rules")({
  validateSearch: (s) => z.object({ create: z.boolean().optional() }).parse(s),
  head: () => ({ meta: [{ title: "Automation Rules — Ashinsta" }] }),
  component: RulesPage,
});

const EMPTY: RuleValues = { keyword: "", match_type: "contains", reply_message: "", case_sensitive: false, cooldown_minutes: 0, is_active: true };

function RuleForm({ initial, onSubmit, pending }: { initial: RuleValues; onSubmit: (v: RuleValues) => void; pending: boolean }) {
  const form = useForm<RuleValues>({ resolver: zodResolver(ruleSchema), defaultValues: initial });
  const { register, handleSubmit, formState, watch, setValue } = form;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormField label="Keyword" placeholder="price" error={formState.errors.keyword?.message} {...register("keyword")} />
      <div className="space-y-1.5">
        <Label htmlFor="match_type">Match type</Label>
        <Select value={watch("match_type")} onValueChange={(v) => setValue("match_type", v as MatchType)}>
          <SelectTrigger id="match_type" className="h-11 rounded-xl bg-card/70"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(MATCH_TYPE_LABELS) as MatchType[]).map((k) => (
              <SelectItem key={k} value={k}>{MATCH_TYPE_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reply_message">Reply message</Label>
        <Textarea id="reply_message" rows={3} placeholder="Thanks for your interest! Please check our profile for more details." className="rounded-xl bg-card/70" aria-invalid={!!formState.errors.reply_message} {...register("reply_message")} />
        {formState.errors.reply_message && <p role="alert" className="text-xs font-medium text-rose">{formState.errors.reply_message.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cooldown">Cooldown (minutes)</Label>
        <Input id="cooldown" type="number" min={0} max={10080} className="h-11 rounded-xl bg-card/70" {...register("cooldown_minutes")} />
        <p className="text-xs text-muted-foreground">Minimum time between two replies from this rule. 0 = no cooldown.</p>
        {formState.errors.cooldown_minutes && <p role="alert" className="text-xs font-medium text-rose">{formState.errors.cooldown_minutes.message}</p>}
      </div>
      <div className="flex items-center justify-between rounded-xl bg-card/50 px-3 py-2.5">
        <Label htmlFor="case_sensitive">Case sensitive</Label>
        <Switch id="case_sensitive" checked={watch("case_sensitive")} onCheckedChange={(v) => setValue("case_sensitive", v)} />
      </div>
      <div className="flex items-center justify-between rounded-xl bg-card/50 px-3 py-2.5">
        <Label htmlFor="is_active">Active</Label>
        <Switch id="is_active" checked={watch("is_active")} onCheckedChange={(v) => setValue("is_active", v)} />
      </div>
      <Button type="submit" variant="brand" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        Save rule
      </Button>
    </form>
  );
}

function RuleTester({ rules }: { rules: AutomationRule[] }) {
  const [text, setText] = useState("");
  const replies = useReplies();
  const lastRepliedAt = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const r of replies.data ?? []) if (r.rule_id && r.replied_at && !map[r.rule_id]) map[r.rule_id] = r.replied_at;
    return map;
  }, [replies.data]);
  const evaluations = text.trim() ? evaluateRules(text, rules, { lastRepliedAt }) : [];
  const winner = selectRule(evaluations);
  const matched = evaluations.filter((e) => e.matched);
  return (
    <GlassCard className="border-brand/20 bg-gradient-to-br from-brand/10 to-brand-2/10 p-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="size-4 text-brand" aria-hidden />
        <h2 className="font-display text-[15px] font-semibold">Test a rule</h2>
      </div>
      <Input aria-label="Sample comment" placeholder="Can you tell me the price?" value={text} onChange={(e) => setText(e.target.value)} className="mt-3 h-11 rounded-xl bg-card/70" />
      {text.trim() && (
        <div className="mt-3 rounded-xl bg-card/70 p-3 text-sm">
          {winner ? (
            <>
              <div className="flex items-center gap-1.5 font-semibold text-mint"><span className="size-1.5 rounded-full bg-mint" />Would trigger · rule "{winner.rule.keyword}" ({MATCH_TYPE_LABELS[winner.rule.match_type as MatchType]})</div>
              <p className="mt-1 text-muted-foreground">Expected reply: “{winner.rule.reply_message}”</p>
            </>
          ) : matched.length > 0 ? (
            <div className="space-y-1">
              <div className="font-semibold text-amber">Matched but would not trigger</div>
              {matched.map((m) => <p key={m.rule.id} className="text-muted-foreground">"{m.rule.keyword}": {m.reason}</p>)}
            </div>
          ) : (
            <div className="font-semibold text-muted-foreground">No rule matches this comment.</div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

function RulesPage() {
  const rules = useRules();
  const account = useInstagramAccount();
  const { create, update, toggle, remove } = useRuleMutations();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<AutomationRule | "new" | null>(null);
  const [deleting, setDeleting] = useState<AutomationRule | null>(null);

  useEffect(() => {
    if (search.create) {
      setEditing("new");
      navigate({ to: "/rules", search: {}, replace: true });
    }
  }, [search.create, navigate]);

  const submit = (values: RuleValues) => {
    if (editing === "new") create.mutate({ values, instagramAccountId: account.data?.id ?? null }, { onSuccess: () => setEditing(null) });
    else if (editing) update.mutate({ id: editing.id, values }, { onSuccess: () => setEditing(null) });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automation Rules"
        description="Keyword rules that decide which comments get an automatic reply."
        actions={<Button variant="brand" onClick={() => setEditing("new")}><Plus aria-hidden />New rule</Button>}
      />

      {rules.data && <RuleTester rules={rules.data} />}

      {rules.isPending ? <CardSkeleton rows={4} /> : rules.isError ? <ErrorState onRetry={() => rules.refetch()} /> : rules.data.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No rules yet"
          description="Create a rule like “price” → “Check our profile for pricing” to start replying automatically."
          action={<Button variant="brand" onClick={() => setEditing("new")}><Plus aria-hidden />Create rule</Button>}
        />
      ) : (
        <div className="space-y-3">
          {rules.data.map((rule) => (
            <GlassCard key={rule.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-brand/10 px-2 py-0.5 font-display text-xs font-semibold text-brand">{rule.keyword}</span>
                    <Badge variant="muted">{MATCH_TYPE_LABELS[rule.match_type as MatchType]}</Badge>
                    {!rule.is_active && <Badge variant="amber">Paused</Badge>}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">“{rule.reply_message}”</p>
                </div>
                <Switch aria-label={`${rule.is_active ? "Disable" : "Enable"} rule ${rule.keyword}`} checked={rule.is_active} onCheckedChange={(v) => toggle.mutate({ rule, isActive: v })} disabled={toggle.isPending} />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>cooldown {rule.cooldown_minutes}m · {rule.case_sensitive ? "case-sensitive" : "case-insensitive"}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(rule)}><Pencil aria-hidden />Edit</Button>
                  <Button variant="ghost" size="sm" className="text-rose hover:text-rose" onClick={() => setDeleting(rule)}><Trash2 aria-hidden />Delete</Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="glass max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "New rule" : "Edit rule"}</DialogTitle>
            <DialogDescription>When a comment matches the keyword, Ashinsta replies with your message.</DialogDescription>
          </DialogHeader>
          {editing && (
            <RuleForm
              key={editing === "new" ? "new" : editing.id}
              initial={editing === "new" ? EMPTY : { keyword: editing.keyword, match_type: editing.match_type as MatchType, reply_message: editing.reply_message, case_sensitive: editing.case_sensitive, cooldown_minutes: editing.cooldown_minutes, is_active: editing.is_active }}
              onSubmit={submit}
              pending={create.isPending || update.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete rule "${deleting?.keyword}"?`}
        description="This cannot be undone. Past replies made by this rule are kept in history."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}
