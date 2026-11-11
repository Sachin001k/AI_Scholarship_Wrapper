/**
 * FundingPlanService (design doc §3.5, §7.4): cost − scholarships = gap,
 * then loan suggestions for the gap via a LoanSuggestionStrategy.
 */
import type { Money, Opportunity, Program, University } from "../domain/types";
import { convert } from "./fx";

export interface LoanSuggestionStrategy {
  readonly id: string;
  readonly label: string;
  sort(loans: Opportunity[]): Opportunity[];
}

export const LowestRateFirst: LoanSuggestionStrategy = {
  id: "lowest-rate",
  label: "Lowest rate first",
  sort: (l) => [...l].sort((a, b) => a.loanTerms!.rateMinPct - b.loanTerms!.rateMinPct),
};

export const NoCosignerFirst: LoanSuggestionStrategy = {
  id: "no-cosigner",
  label: "No cosigner / collateral first",
  sort: (l) =>
    [...l].sort(
      (a, b) =>
        Number(a.loanTerms!.cosignerRequired) + Number(a.loanTerms!.collateralRequired) -
          (Number(b.loanTerms!.cosignerRequired) + Number(b.loanTerms!.collateralRequired)) ||
        a.loanTerms!.rateMinPct - b.loanTerms!.rateMinPct,
    ),
};

export const LOAN_STRATEGIES = [LowestRateFirst, NoCosignerFirst];

export interface FundingPlan {
  currency: string;
  years: number;
  cost: { tuition: number; fees: number; living: number; total: number };
  scholarships: { opportunity: Opportunity; amount: number }[];
  scholarshipTotal: number;
  gap: number;
  loans: { opportunity: Opportunity; covers: number; monthly: number }[];
}

/** Monthly repayment for an amortised loan. */
export function monthlyPayment(principal: number, annualRatePct: number, years = 10): number {
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (principal <= 0) return 0;
  return r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
}

/** Scholarships/loans that could apply to this program at all. */
export function applicableTo(o: Opportunity, program: Program, university: University): boolean {
  const country = o.hostCountries.includes("*") || o.hostCountries.includes(university.country);
  const level = o.levels.length === 0 || o.levels.includes(program.level);
  const uni = !o.universityIds?.length || o.universityIds.includes(university.id);
  return country && level && uni;
}

export function buildFundingPlan(args: {
  program: Program;
  selectedScholarships: Opportunity[];
  loans: Opportunity[];
  currency: string;
  strategy: LoanSuggestionStrategy;
}): FundingPlan {
  const { program, selectedScholarships, loans, currency, strategy } = args;
  const years = Math.max(1, Math.round(program.durationMonths / 12));
  const c = program.costs.find((x) => x.audience === "INTERNATIONAL") ?? program.costs[0];
  const toLocal = (m: Money) => convert(m, currency).amount * years;

  const tuition = c ? toLocal(c.tuition) : 0;
  const fees = c ? toLocal(c.fees) : 0;
  const living = c ? toLocal(c.living) : 0;
  const total = tuition + fees + living;

  let remaining = total;
  const scholarships = selectedScholarships.map((o) => {
    // Award amounts are stored per year (estimate); cap at what is still unfunded.
    const perYear = o.award?.amount ? convert(o.award.amount, currency).amount : 0;
    const amount = Math.min(remaining, perYear * years);
    remaining -= amount;
    return { opportunity: o, amount };
  });
  const scholarshipTotal = total - remaining;
  const gap = Math.max(0, remaining);

  const suggestions = strategy.sort(loans.filter((l) => l.loanTerms)).map((o) => {
    const max = convert(o.loanTerms!.maxAmount, currency).amount;
    const covers = Math.min(max, gap);
    return { opportunity: o, covers, monthly: monthlyPayment(covers, o.loanTerms!.rateMinPct) };
  });

  return { currency, years, cost: { tuition, fees, living, total }, scholarships, scholarshipTotal, gap, loans: suggestions };
}
