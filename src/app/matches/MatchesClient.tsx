"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Lightbulb } from "lucide-react";
import clsx from "clsx";
import type { Verdict } from "@/lib/domain/types";
import { COUNTRY_BY_CODE, LEVEL_LABEL } from "@/lib/domain/reference";
import { formatCompactMoney } from "@/lib/domain/values";
import { attributeLabel } from "@/lib/eligibility/attributes";
import { profileStore } from "@/lib/store/stores";
import { useMatches } from "@/lib/store/use-matches";
import { OpportunityCard } from "@/components/ui/opportunity";

const TABS: { key: Verdict; label: string; hint: string }[] = [
  { key: "ELIGIBLE", label: "Eligible", hint: "You meet every requirement we can check." },
  { key: "NEEDS_INFO", label: "Needs info", hint: "Answer a question or two to find out." },
  { key: "NEAR_MISS", label: "Almost", hint: "You miss just one requirement." },
];

export default function MatchesClient() {
  const profile = profileStore.useStore();
  const hydrated = profileStore.useHydrated();
  const { data, loading, error } = useMatches(profile);
  const [tab, setTab] = useState<Verdict>("ELIGIBLE");
  const [kind, setKind] = useState<"ALL" | "SCHOLARSHIP" | "LOAN">("ALL");

  const list = useMemo(
    () => data?.matches.filter((m) => m.verdict === tab && (kind === "ALL" || m.opportunity.kind === kind)) ?? [],
    [data, tab, kind],
  );

  if (!hydrated) return <div className="min-h-[70vh]" />;
  if (!profile) return <EmptyProfile />;

  const t = data?.totals;
  const counts: Record<Verdict, number> = { ELIGIBLE: t?.eligible ?? 0, NEEDS_INFO: t?.needsInfo ?? 0, NEAR_MISS: t?.nearMiss ?? 0 };
  const prompt = data?.prompts[0];
  const destinations = profile.targetCountries.map((c) => COUNTRY_BY_CODE[c]?.name ?? c).join(", ");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Summary */}
      <header>
        {loading || !t ? (
          <h1 className="text-3xl font-semibold tracking-tight">Checking scholarships for you…</h1>
        ) : (
          <h1 className="text-3xl font-semibold tracking-tight">
            You qualify for {t.eligible} {t.eligible === 1 ? "opportunity" : "opportunities"}
          </h1>
        )}
        <p className="mt-2 text-muted">
          {LEVEL_LABEL[profile.targetLevel]} in {destinations}
          {t?.eligibleValue && <> · scholarships worth up to {formatCompactMoney(t.eligibleValue)} in total</>} ·{" "}
          <Link href="/onboarding" className="font-medium text-brand hover:underline">
            Edit answers
          </Link>
        </p>
      </header>

      {error && <p className="mt-6 rounded-lg bg-miss-soft p-4 text-sm text-miss">Couldn&apos;t load matches: {error}</p>}

      {/* One helpful nudge, not a wall of them */}
      {prompt && (
        <Link href="/onboarding" className="mt-6 flex items-center gap-3 rounded-xl border border-warn/30 bg-warn-soft p-4 text-sm hover:border-warn/60">
          <Lightbulb className="h-5 w-5 shrink-0 text-warn" />
          <span>
            Add your <strong>{attributeLabel(prompt.attr).toLowerCase()}</strong> to check {prompt.count} more{" "}
            {prompt.count === 1 ? "opportunity" : "opportunities"}.
          </span>
          <ArrowRight className="ml-auto h-4 w-4 text-warn" />
        </Link>
      )}

      {/* Tabs + type filter */}
      {data && (
        <div className="mt-8 flex flex-col gap-4 border-b border-line sm:flex-row sm:items-end sm:justify-between">
          <div role="tablist" className="-mb-px flex gap-6">
            {TABS.map((x) => (
              <button
                key={x.key}
                role="tab"
                aria-selected={tab === x.key}
                onClick={() => setTab(x.key)}
                className={clsx(
                  "border-b-2 pb-3 text-sm font-medium transition-colors",
                  tab === x.key ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {x.label} <span className="ml-1 rounded-full bg-subtle px-2 py-0.5 text-xs text-muted">{counts[x.key]}</span>
              </button>
            ))}
          </div>
          <div className="mb-3 flex gap-1 rounded-lg bg-subtle p-1 text-sm">
            {(["ALL", "SCHOLARSHIP", "LOAN"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={clsx("rounded-md px-3 py-1", kind === k ? "bg-surface font-medium shadow-sm" : "text-muted")}
              >
                {k === "ALL" ? "All" : k === "LOAN" ? "Loans" : "Scholarships"}
              </button>
            ))}
          </div>
        </div>
      )}

      {data && <p className="mt-4 text-sm text-muted">{TABS.find((x) => x.key === tab)!.hint}</p>}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && !data
          ? [0, 1, 2].map((i) => <div key={i} className="card h-44 animate-pulse bg-subtle" />)
          : list.map((m) => (
              <OpportunityCard key={m.opportunity.id} o={m.opportunity} verdict={m.verdict} reasons={m.reasons} localValue={m.localValue} zone={profile.timeZone} />
            ))}
      </div>
      {data && list.length === 0 && <p className="mt-6 text-sm text-muted">Nothing in this list yet.</p>}

      {data && (
        <div className="card mt-12 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold">Know which program you want?</p>
            <p className="text-sm text-muted">See how scholarships and loans could cover the full cost.</p>
          </div>
          <Link href="/plan" className="btn btn-secondary">
            Plan my funding <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
      {data?.source === "seed" && <p className="mt-6 text-xs text-muted">Showing sample data. Always check details on the official site.</p>}
    </div>
  );
}

function EmptyProfile() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Let&apos;s find your matches</h1>
      <p className="mt-2 text-muted">Answer a few quick questions — about 2 minutes, no account needed.</p>
      <Link href="/onboarding" className="btn btn-primary mt-6">
        Get started <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
