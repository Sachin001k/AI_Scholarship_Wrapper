/**
 * EligibilityEngine (design doc §6.3). Deterministic: rules decide
 * eligibility; any AI layer may only explain the verdict.
 */
import type { Opportunity, RuleNode, StudentProfile, Verdict } from "../domain/types";
import { isOpen } from "../domain/values";
import { defaultRates, type ExchangeRateProvider } from "../funding/fx";
import { toAttributes, type Attributes } from "./attributes";
import { createDefaultRegistry, type Reason, type RuleRegistry } from "./rules";

export interface MatchResult {
  opportunityId: string;
  verdict: Verdict;
  reasons: Reason[];
  failedLeafCount: number;
}

/** Pre-filter (Path A step 1). Mirrors the SQL in doc §6.3 for the seed repo. */
export function preFilter(o: Opportunity, a: Attributes, at = new Date()): boolean {
  const overlaps = (col: string[], v: unknown) =>
    col.includes("*") || (Array.isArray(v) && v.some((x) => col.includes(x)));
  return (
    isOpen(o.deadline, at) &&
    overlaps(o.hostCountries, a.targetCountries) &&
    overlaps(o.nationalitiesIn, a.nationalities) &&
    (o.levels.length === 0 || o.levels.includes(a.targetLevel as never)) &&
    overlaps(o.fields, a.fieldsOfStudy)
  );
}

/** The pre-filter columns double as explicit conditions so they appear in "why you match". */
function baseRule(o: Opportunity): RuleNode[] {
  const nodes: RuleNode[] = [];
  if (!o.hostCountries.includes("*"))
    nodes.push({ type: "overlap", attr: "targetCountries", values: o.hostCountries });
  if (!o.nationalitiesIn.includes("*"))
    nodes.push({ type: "overlap", attr: "nationalities", values: o.nationalitiesIn });
  if (o.levels.length) nodes.push({ type: "inSet", attr: "targetLevel", values: o.levels });
  if (!o.fields.includes("*")) nodes.push({ type: "overlap", attr: "fieldsOfStudy", values: o.fields });
  return nodes;
}

export class EligibilityEngine {
  constructor(
    private readonly registry: RuleRegistry = createDefaultRegistry(),
    private readonly rates: ExchangeRateProvider = defaultRates,
  ) {}

  evaluate(profile: StudentProfile, o: Opportunity, at = new Date()): MatchResult {
    const ctx = { attributes: toAttributes(profile), at, rates: this.rates };
    const tree: RuleNode = { type: "allOf", children: [...baseRule(o), o.rules] };
    const r = this.registry.get(`${o.id}:${hashRule(tree)}`, tree).evaluate(ctx);
    const verdict: Verdict | null =
      r.outcome === "PASS" ? "ELIGIBLE" : r.outcome === "UNKNOWN" ? "NEEDS_INFO" : r.failedLeafCount === 1 ? "NEAR_MISS" : null;
    return {
      opportunityId: o.id,
      verdict: verdict ?? "NEAR_MISS",
      reasons: r.reasons,
      failedLeafCount: r.failedLeafCount,
    };
  }

  /** Returns eligible, needs-info and near-miss results; clear fails are dropped. */
  match(profile: StudentProfile, candidates: Opportunity[], at = new Date()): MatchResult[] {
    const attrs = toAttributes(profile);
    const out: MatchResult[] = [];
    for (const o of candidates) {
      if (!preFilter(o, attrs, at)) continue;
      const r = this.evaluate(profile, o, at);
      if (r.verdict === "NEAR_MISS" && r.failedLeafCount !== 1) continue;
      out.push(r);
    }
    return out;
  }
}

/** Small stable hash so edited rules get a new cache key. */
function hashRule(node: RuleNode): string {
  const s = JSON.stringify(node);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * "Answer one more question to check N more scholarships" (doc §3.7).
 * Counts which unanswered attributes block the most NEEDS_INFO results.
 */
export function missingInfoPrompts(results: MatchResult[]): { attr: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of results) {
    if (r.verdict !== "NEEDS_INFO") continue;
    const attrs = new Set(r.reasons.filter((x) => x.status === "UNKNOWN").map((x) => x.attr));
    for (const a of attrs) counts.set(a, (counts.get(a) ?? 0) + 1);
  }
  return [...counts.entries()].map(([attr, count]) => ({ attr, count })).sort((a, b) => b.count - a.count);
}
