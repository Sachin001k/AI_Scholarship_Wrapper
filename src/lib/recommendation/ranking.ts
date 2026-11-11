/**
 * RankingStrategy (design doc §6.3):
 *   score = 0.35 × deadlineUrgency + 0.30 × benefitValue
 *         + 0.25 × targetSpecificity + 0.10 × dataFreshness
 */
import type { Opportunity, Verdict } from "../domain/types";
import { daysLeft } from "../domain/values";
import { convert, type ExchangeRateProvider, defaultRates } from "../funding/fx";

export interface RankingStrategy {
  score(o: Opportunity, at: Date): number;
}

const clamp = (x: number) => Math.max(0, Math.min(1, x));

export class WeightedRanking implements RankingStrategy {
  constructor(private readonly rates: ExchangeRateProvider = defaultRates) {}

  score(o: Opportunity, at: Date): number {
    const d = daysLeft(o.deadline, at);
    const urgency = d === null ? 0.3 : clamp(1 - d / 180);

    const money = o.award?.amount ?? o.loanTerms?.maxAmount;
    const usd = money ? convert(money, "USD", this.rates).amount : 0;
    const benefit = clamp(Math.log10(usd + 1) / 5) * (o.kind === "LOAN" ? 0.6 : 1);

    const dims = [o.hostCountries, o.nationalitiesIn, o.fields];
    const wildcards = dims.filter((c) => c.includes("*")).length;
    const specificity = clamp(1 - wildcards / 4 + (o.basis === "UNIVERSITY_SPECIFIC" ? 0.2 : 0));

    const ageDays = o.lastVerifiedAt ? (at.getTime() - new Date(o.lastVerifiedAt).getTime()) / 86_400_000 : Infinity;
    const freshness = ageDays === Infinity ? 0.2 : clamp(1 - ageDays / 365);

    return 0.35 * urgency + 0.3 * benefit + 0.25 * specificity + 0.1 * freshness;
  }
}

const VERDICT_ORDER: Record<Verdict, number> = { ELIGIBLE: 0, NEEDS_INFO: 1, NEAR_MISS: 2 };

export function rank<T extends { verdict: Verdict; score: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] || b.score - a.score);
}
