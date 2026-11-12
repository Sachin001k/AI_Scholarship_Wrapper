"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { Opportunity, Program, University } from "@/lib/domain/types";
import { COUNTRIES } from "@/lib/domain/reference";
import { formatMoney } from "@/lib/domain/values";
import { EligibilityEngine } from "@/lib/eligibility/engine";
import { LOAN_STRATEGIES, applicableTo, buildFundingPlan } from "@/lib/funding/plan";
import { convert, defaultRates, hasRate } from "@/lib/funding/fx";
import { profileStore } from "@/lib/store/stores";
import { VerdictBadge, opportunityHref } from "@/components/ui/opportunity";

const engine = new EligibilityEngine();
const VERDICT_RANK = { ELIGIBLE: 0, NEEDS_INFO: 1, NEAR_MISS: 2 } as const;
const usd = (o: Opportunity) => (o.award?.amount ? convert(o.award.amount, "USD").amount : 0);
const CURRENCIES = [...new Set(COUNTRIES.map((c) => c.currency))].filter(hasRate).sort();

export default function PlanClient({
  universities,
  programs,
  opportunities,
}: {
  universities: University[];
  programs: Program[];
  opportunities: Opportunity[];
}) {
  const profile = profileStore.useStore();
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [currency, setCurrency] = useState("USD");
  const [strategyId, setStrategyId] = useState(LOAN_STRATEGIES[0].id);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("program");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync initial selection from URL
    if (p && programs.some((x) => x.id === p)) setProgramId(p);
  }, [programs]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- default to the student's currency
    if (profile?.currency) setCurrency(profile.currency);
  }, [profile?.currency]);

  const program = programs.find((p) => p.id === programId);
  const university = universities.find((u) => u.id === program?.universityId);

  // Scholarships that could apply to this program, with the student's verdict; eligible + biggest first.
  const candidates = useMemo(() => {
    if (!program || !university) return [];
    return opportunities
      .filter((o) => o.kind === "SCHOLARSHIP" && applicableTo(o, program, university))
      .map((o) => {
        const r = profile ? engine.evaluate(profile, o) : null;
        return { o, verdict: r && r.failedLeafCount <= 1 ? r.verdict : null };
      })
      .filter((x) => !profile || x.verdict)
      .sort((a, b) => VERDICT_RANK[a.verdict ?? "NEAR_MISS"] - VERDICT_RANK[b.verdict ?? "NEAR_MISS"] || usd(b.o) - usd(a.o));
  }, [opportunities, program, university, profile]);

  const loans = useMemo(
    () =>
      program && university
        ? opportunities.filter(
            (o) =>
              o.kind === "LOAN" &&
              applicableTo(o, program, university) &&
              (!profile || o.nationalitiesIn.includes("*") || profile.nationalities.some((n) => o.nationalitiesIn.includes(n))),
          )
        : [],
    [opportunities, program, university, profile],
  );

  // Default: the single best eligible award (big awards rarely stack).
  useEffect(() => {
    const best = candidates.find((c) => c.verdict === "ELIGIBLE") ?? candidates[0];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset picks when the program changes
    setPicked(best ? { [best.o.id]: true } : {});
  }, [programId, candidates.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!program || !university) return null;
  const strategy = LOAN_STRATEGIES.find((s) => s.id === strategyId)!;
  const plan = buildFundingPlan({
    program,
    selectedScholarships: candidates.filter((c) => picked[c.o.id]).map((c) => c.o),
    loans,
    currency,
    strategy,
  });
  const loanCover = plan.loans[0]?.covers ?? 0;
  const remaining = Math.max(0, plan.gap - loanCover);
  const pct = (n: number) => (plan.cost.total ? (n / plan.cost.total) * 100 : 0);
  const fm = (n: number) => formatMoney({ amount: n, currency });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Funding plan</h1>
      <p className="mt-2 text-muted">Pick a program to see its full cost, what scholarships could cover, and loan options for the rest.</p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1 text-sm">
          <span className="mb-1 block text-muted">Program</span>
          <select value={programId} onChange={(e) => setProgramId(e.target.value)} className="input">
            {universities.map((u) => (
              <optgroup key={u.id} label={u.name}>
                {programs
                  .filter((p) => p.universityId === u.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="text-sm sm:w-32">
          <span className="mb-1 block text-muted">Currency</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Summary */}
      <section className="card mt-6 p-6">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label={`Total cost · ${plan.years} yr${plan.years > 1 ? "s" : ""}`} value={fm(plan.cost.total)} />
          <Stat label="Scholarships" value={`− ${fm(plan.scholarshipTotal)}`} cls="text-ok" />
          <Stat label="Loan could cover" value={`− ${fm(loanCover)}`} cls="text-brand" />
          <Stat label="Still to find" value={fm(remaining)} cls={remaining > 0 ? "text-miss" : "text-ok"} />
        </div>
        <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-subtle" role="img" aria-label="Funding breakdown">
          <div className="h-full bg-ok transition-all" style={{ width: `${pct(plan.scholarshipTotal)}%` }} />
          <div className="h-full bg-brand transition-all" style={{ width: `${pct(loanCover)}%` }} />
          <div className="h-full bg-miss/60 transition-all" style={{ width: `${pct(remaining)}%` }} />
        </div>
        <p className="mt-3 text-xs text-muted">
          Tuition {fm(plan.cost.tuition)} · fees {fm(plan.cost.fees)} · living {fm(plan.cost.living)} · exchange rates of {defaultRates.rateDate}
        </p>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-semibold">Scholarships</h2>
          <p className="mt-1 text-sm text-muted">Tick the ones to include. Big awards usually can&apos;t be combined.</p>
          {!profile && (
            <p className="mt-3 rounded-lg bg-warn-soft p-3 text-sm text-warn">
              <Link href="/onboarding" className="font-medium underline">
                Answer a few questions
              </Link>{" "}
              to see only the ones you qualify for.
            </p>
          )}
          <ul className="mt-4 space-y-2">
            {candidates.length === 0 && <li className="text-sm text-muted">No scholarships for this program yet.</li>}
            {candidates.map(({ o, verdict }) => {
              const line = plan.scholarships.find((s) => s.opportunity.id === o.id);
              return (
                <li key={o.id}>
                  <label className={clsx("flex cursor-pointer items-start gap-3 rounded-lg border p-3", picked[o.id] ? "border-brand bg-brand-soft" : "border-line hover:bg-subtle")}>
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[#1d4ed8]"
                      checked={!!picked[o.id]}
                      onChange={() => setPicked((p) => ({ ...p, [o.id]: !p[o.id] }))}
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{o.title}</span>
                      {picked[o.id] && line ? <span className="text-sm text-ok">{fm(line.amount)}</span> : <span className="text-xs text-muted">{o.award?.coverage}</span>}
                    </span>
                    {verdict && <VerdictBadge verdict={verdict} />}
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Loans for the rest</h2>
            <select aria-label="Sort loans" value={strategyId} onChange={(e) => setStrategyId(e.target.value)} className="input w-auto py-1.5 text-sm">
              {LOAN_STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          {plan.gap === 0 ? (
            <p className="mt-4 text-sm text-ok">Your scholarships cover the whole cost — no loan needed.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {plan.loans.length === 0 && <li className="text-sm text-muted">No loans in our list fit this program yet.</li>}
              {plan.loans.map((l, i) => {
                const t = l.opportunity.loanTerms!;
                return (
                  <li key={l.opportunity.id} className={clsx("rounded-lg border p-3", i === 0 ? "border-brand" : "border-line")}>
                    <div className="flex items-start justify-between gap-3">
                      <Link href={opportunityHref(l.opportunity)} className="text-sm font-medium hover:text-brand">
                        {l.opportunity.title}
                      </Link>
                      {i === 0 && <span className="badge bg-brand-soft text-brand">Best fit</span>}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {t.rateMinPct}–{t.rateMaxPct}% · {t.cosignerRequired ? "cosigner needed" : "no cosigner"} · {t.collateralRequired ? "collateral needed" : "no collateral"}
                    </p>
                    <p className="mt-2 text-sm">
                      Covers <strong>{fm(l.covers)}</strong> <span className="text-muted">· about {fm(l.monthly)}/month over 10 years</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted">Estimates only. Real rates depend on the lender.</p>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, cls = "text-ink" }: { label: string; value: string; cls?: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={clsx("mt-1 text-xl font-semibold", cls)}>{value}</p>
    </div>
  );
}
