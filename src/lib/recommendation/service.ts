/**
 * RecommendationService: runs the engine over the catalog and ranks results
 * (Path A, student-triggered matching — design doc §5.4).
 */
import type { Money, Opportunity, StudentProfile, Verdict } from "../domain/types";
import { EligibilityEngine, missingInfoPrompts } from "../eligibility/engine";
import type { Reason } from "../eligibility/rules";
import { convert, hasRate } from "../funding/fx";
import { WeightedRanking, rank } from "./ranking";

export interface RankedMatch {
  opportunity: Opportunity;
  verdict: Verdict;
  reasons: Reason[];
  score: number;
  /** Benefit converted to the student's currency, with the original kept. */
  localValue: Money | null;
}

export interface MatchResponse {
  matches: RankedMatch[];
  prompts: { attr: string; count: number }[];
  totals: { eligible: number; needsInfo: number; nearMiss: number; eligibleValue: Money | null };
  computedAt: string;
}

const engine = new EligibilityEngine();
const ranking = new WeightedRanking();

export function computeMatches(profile: StudentProfile, catalog: Opportunity[], at = new Date()): MatchResponse {
  const byId = new Map(catalog.map((o) => [o.id, o]));
  const ccy = hasRate(profile.currency) ? profile.currency : "USD";
  const results = engine.match(profile, catalog, at);

  const matches = rank(
    results.map((r) => {
      const o = byId.get(r.opportunityId)!;
      const value = o.award?.amount ?? o.loanTerms?.maxAmount ?? null;
      return {
        opportunity: o,
        verdict: r.verdict,
        reasons: r.reasons,
        score: ranking.score(o, at),
        localValue: value ? convert(value, ccy) : null,
      };
    }),
  );

  const eligibleScholarships = matches.filter((m) => m.verdict === "ELIGIBLE" && m.opportunity.kind === "SCHOLARSHIP");
  const eligibleValue = eligibleScholarships.reduce(
    (sum, m) => sum + (m.localValue?.amount ?? 0),
    0,
  );

  return {
    matches,
    prompts: missingInfoPrompts(results),
    totals: {
      eligible: matches.filter((m) => m.verdict === "ELIGIBLE").length,
      needsInfo: matches.filter((m) => m.verdict === "NEEDS_INFO").length,
      nearMiss: matches.filter((m) => m.verdict === "NEAR_MISS").length,
      eligibleValue: eligibleScholarships.length ? { amount: eligibleValue, currency: ccy } : null,
    },
    computedAt: at.toISOString(),
  };
}
