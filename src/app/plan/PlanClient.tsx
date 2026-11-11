"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, Landmark, PiggyBank } from "lucide-react";
import clsx from "clsx";
import type { Opportunity, Program, University } from "@/lib/domain/types";
import { COUNTRIES, flag } from "@/lib/domain/reference";
import { formatMoney } from "@/lib/domain/values";
import { EligibilityEngine } from "@/lib/eligibility/engine";
import { LOAN_STRATEGIES, applicableTo, buildFundingPlan } from "@/lib/funding/plan";
import { defaultRates, hasRate } from "@/lib/funding/fx";
import { profileStore } from "@/lib/store/stores";
import { VerdictBadge, opportunityHref } from "@/components/ui/opportunity";

const engine = new EligibilityEngine();
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

  const program = programs.find((p) => p.id === programId)!;
  const university = universities.find((u) => u.id === program?.universityId)!;

  // Scholarships that could apply to this program, with the student's verdict.
  const candidates = useMemo(() => {
    if (!program) return [];
    return opportunities
      .filter((o) => o.kind === "SCHOLARSHIP" && applicableTo(o, program, university))
      .map((o) => {
        const r = profile ? engine.evaluate(profile, o) : null;
        return { o, verdict: r && r.failedLeafCount <= 1 ? r.verdict : null };
      })
      .filter((x) => !profile || x.verdict);
  }, [opportunities, program, university, profile]);

  const loans = useMemo(
    () =>
      program
        ? opportunities.filter(
            (o) =>
              o.kind === "LOAN" &&
              applicableTo(o, program, university) &&
              (!profile || o.nationalitiesIn.includes("*") || profile.nationalities.some((n) => o.nationalitiesIn.includes(n))),
          )
        : [],
    [opportunities, program, university, profile],
  );

  // Default selection: the single best eligible award (awards rarely stack).
  useEffect(() => {
    const best = candidates.find((c) => c.verdict === "ELIGIBLE") ?? candidates[0];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset picks when the program changes
    setPicked(best ? { [best.o.id]: true } : {});
  }, [programId, candidates.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!program) return null;
  const strategy = LOAN_STRATEGIES.find((s) => s.id === strategyId)!;
  const plan = buildFundingPlan({
    program,
    selectedScholarships: candidates.filter((c) => picked[c.o.id]).map((c) => c.o),
    loans,
    currency,
    strategy,
  });
  const bestLoan = plan.loans[0];
  const loanCover = bestLoan?.covers ?? 0;
  const remaining = Math.max(0, plan.gap - loanCover);
  const pct = (n: number) => (plan.cost.total ? (n / plan.cost.total) * 100 : 0);
  const fm = (n: number) => formatMoney({ amount: n, currency });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-display text-4xl font-bold sm:text-5xl">
        Your <span className="text-gradient">funding plan</span>
      </h1>
      <p className="mt-2 max-w-2xl text-muted">Total cost − scholarships = your gap. Then we suggest loans that could cover the rest.</p>

      {/* Controls */}
      <div className="glass mt-8 grid gap-3 rounded-2xl p-4 sm:grid-cols-[1fr_auto]">
        <label className="text-sm">
          <span className="mb-1 block text-muted">Program</span>
          <select value={programId} onChange={(e) => setProgramId(e.target.value)} className="w-full rounded-xl bg-white/5 px-3 py-2.5 [&>optgroup]:bg-ink [&>option]:bg-ink">
            {universities.map((u) => (
              <optgroup key={u.id} label={`${flag(u.country)} ${u.name}`}>
                {programs
                  .filter((p) => p.universityId === u.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Show in</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-xl bg-white/5 px-3 py-2.5 [&>option]:bg-ink">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      {/* The big picture */}
      <section className="glass mt-6 rounded-[2rem] p-6 sm:p-10">
        <div className="grid gap-6 sm:grid-cols-4">
          <Big label={`Total cost (${plan.years} yr${plan.years > 1 ? "s" : ""})`} value={fm(plan.cost.total)} />
          <Big label="Scholarships" value={`− ${fm(plan.scholarshipTotal)}`} cls="text-ok" />
          <Big label="Loan could cover" value={`− ${fm(loanCover)}`} cls="text-cyan" />
          <Big label="Still to find" value={fm(remaining)} cls={remaining > 0 ? "text-miss" : "text-ok"} />
        </div>
        <div className="mt-8 flex h-6 overflow-hidden rounded-full bg-white/10" role="img" aria-label="Funding breakdown">
          <motion.div className="h-full bg-ok" animate={{ width: `${pct(plan.scholarshipTotal)}%` }} transition={{ type: "spring", stiffness: 80, damping: 18 }} />
          <motion.div className="h-full bg-cyan" animate={{ width: `${pct(loanCover)}%` }} transition={{ type: "spring", stiffness: 80, damping: 18 }} />
          <motion.div className="h-full bg-miss/70" animate={{ width: `${pct(remaining)}%` }} transition={{ type: "spring", stiffness: 80, damping: 18 }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
          <Legend c="bg-ok" l="Scholarships" /> <Legend c="bg-cyan" l="Top loan suggestion" /> <Legend c="bg-miss/70" l="Remaining gap" />
          <span className="ml-auto">
            Tuition {fm(plan.cost.tuition)} · Fees {fm(plan.cost.fees)} · Living {fm(plan.cost.living)} · FX rates of {defaultRates.rateDate}
          </span>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Scholarships */}
        <section className="glass rounded-3xl p-6">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
            <PiggyBank className="h-5 w-5 text-ok" /> Scholarships for this program
          </h2>
          <p className="mt-1 text-sm text-muted">Tap to include. Most big awards can&apos;t be combined — check each provider&apos;s rules.</p>
          {!profile && (
            <p className="mt-3 rounded-xl bg-warn/10 p-3 text-sm text-warn">
              <Link href="/onboarding" className="underline">Add your profile</Link> to see only what you&apos;re eligible for.
            </p>
          )}
          <ul className="mt-4 space-y-2">
            {candidates.length === 0 && <li className="text-sm text-muted">No matching scholarships for this program yet.</li>}
            {candidates.map(({ o, verdict }) => {
              const on = !!picked[o.id];
              const line = plan.scholarships.find((s) => s.opportunity.id === o.id);
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => setPicked((p) => ({ ...p, [o.id]: !p[o.id] }))}
                    aria-pressed={on}
                    className={clsx("flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition-colors", on ? "bg-ok/10 ring-ok/40" : "bg-white/5 ring-white/10 hover:bg-white/10")}
                  >
                    <span className={clsx("grid h-6 w-6 shrink-0 place-items-center rounded-md ring-1", on ? "bg-ok text-ink ring-ok" : "ring-white/30")}>
                      {on && <Check className="h-4 w-4" />}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{o.title}</span>
                      <span className="text-xs text-muted">{o.award?.coverage}</span>
                    </span>
                    <span className="text-right">
                      {verdict && <VerdictBadge verdict={verdict} />}
                      {on && line && <span className="mt-1 block text-sm font-semibold text-ok">{fm(line.amount)}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Loans */}
        <section className="glass rounded-3xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
              <Landmark className="h-5 w-5 text-cyan" /> Loans for the gap
            </h2>
            <div className="flex gap-1 rounded-full bg-white/5 p-1 text-xs">
              {LOAN_STRATEGIES.map((s) => (
                <button key={s.id} onClick={() => setStrategyId(s.id)} aria-pressed={s.id === strategyId} className={clsx("rounded-full px-3 py-1.5", s.id === strategyId ? "bg-cyan/30 text-white" : "text-muted")}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {plan.gap === 0 ? (
            <p className="mt-6 text-ok">🎉 Your scholarships cover the whole cost. No loan needed!</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {plan.loans.length === 0 && <li className="text-sm text-muted">No loans in our catalog fit this program and nationality yet.</li>}
              {plan.loans.map((l, i) => (
                <motion.li key={l.opportunity.id} layout className={clsx("rounded-2xl p-4 ring-1", i === 0 ? "bg-cyan/10 ring-cyan/40" : "bg-white/5 ring-white/10")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={opportunityHref(l.opportunity)} className="font-medium hover:underline">{l.opportunity.title}</Link>
                      <p className="text-xs text-muted">
                        {l.opportunity.loanTerms!.rateMinPct}–{l.opportunity.loanTerms!.rateMaxPct}% ·{" "}
                        {l.opportunity.loanTerms!.cosignerRequired ? "cosigner" : "no cosigner"} ·{" "}
                        {l.opportunity.loanTerms!.collateralRequired ? "collateral" : "no collateral"}
                      </p>
                    </div>
                    {i === 0 && <span className="rounded-full bg-cyan/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-cyan">Top pick</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span>Covers <strong>{fm(l.covers)}</strong></span>
                    <span className="text-muted">≈ {fm(l.monthly)}/month over 10 yrs (at {l.opportunity.loanTerms!.rateMinPct}%)</span>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted">Estimates only. Real rates depend on the lender&apos;s assessment.</p>
        </section>
      </div>
    </div>
  );
}

function Big({ label, value, cls = "text-white" }: { label: string; value: string; cls?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <motion.p key={value} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} className={clsx("mt-1 font-display text-2xl font-bold sm:text-3xl", cls)}>
        {value}
      </motion.p>
    </div>
  );
}

function Legend({ c, l }: { c: string; l: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={clsx("h-2.5 w-2.5 rounded-full", c)} /> {l}
    </span>
  );
}
