import type { AutomationRule, MatchType } from "@/types";

/**
 * Pure keyword matcher. No side effects, safe to run in the browser or on the server.
 */
export function matchesKeyword(
  text: string,
  keyword: string,
  matchType: MatchType,
  caseSensitive: boolean,
): boolean {
  const haystack = caseSensitive ? text.trim() : text.trim().toLowerCase();
  const needle = caseSensitive ? keyword.trim() : keyword.trim().toLowerCase();
  if (!needle) return false;

  switch (matchType) {
    case "contains":
      return haystack.includes(needle);
    case "exact":
      return haystack === needle;
    case "starts_with":
      return haystack.startsWith(needle);
    case "ends_with":
      return haystack.endsWith(needle);
    default:
      return false;
  }
}

export interface RuleEvaluation {
  rule: AutomationRule;
  matched: boolean;
  /** true when rule is active, matched and not in cooldown */
  wouldTrigger: boolean;
  reason: string;
  cooldownEndsAt: Date | null;
}

export interface EvaluateOptions {
  /** Map of rule id → last time this rule replied (for cooldown checks). */
  lastRepliedAt?: Record<string, string | Date | null | undefined>;
  now?: Date;
}

/** Evaluate a comment against a list of rules; returns one evaluation per rule. */
export function evaluateRules(
  commentText: string,
  rules: AutomationRule[],
  options: EvaluateOptions = {},
): RuleEvaluation[] {
  const now = options.now ?? new Date();
  return rules.map((rule) => {
    const matched = matchesKeyword(
      commentText,
      rule.keyword,
      rule.match_type as MatchType,
      rule.case_sensitive,
    );
    let cooldownEndsAt: Date | null = null;
    const last = options.lastRepliedAt?.[rule.id];
    if (last && rule.cooldown_minutes > 0) {
      const ends = new Date(new Date(last).getTime() + rule.cooldown_minutes * 60_000);
      if (ends > now) cooldownEndsAt = ends;
    }

    if (!matched) {
      return { rule, matched, wouldTrigger: false, reason: "Keyword did not match", cooldownEndsAt };
    }
    if (!rule.is_active) {
      return { rule, matched, wouldTrigger: false, reason: "Rule is disabled", cooldownEndsAt };
    }
    if (cooldownEndsAt) {
      return { rule, matched, wouldTrigger: false, reason: "Rule is in cooldown", cooldownEndsAt };
    }
    return { rule, matched, wouldTrigger: true, reason: "Matched and ready to reply", cooldownEndsAt };
  });
}

/**
 * Pick the single rule that should reply. Priority: rules that would trigger,
 * preferring more specific match types, then longer keywords, then oldest rule.
 */
export function selectRule(evaluations: RuleEvaluation[]): RuleEvaluation | null {
  const specificity: Record<MatchType, number> = {
    exact: 4,
    starts_with: 3,
    ends_with: 2,
    contains: 1,
  };
  const candidates = evaluations.filter((e) => e.wouldTrigger);
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => {
    const s =
      specificity[b.rule.match_type as MatchType] - specificity[a.rule.match_type as MatchType];
    if (s !== 0) return s;
    const len = b.rule.keyword.length - a.rule.keyword.length;
    if (len !== 0) return len;
    return a.rule.created_at.localeCompare(b.rule.created_at);
  })[0]!;
}
