"use client";
import Link from "next/link";
import { useMemo } from "react";
import type { Opportunity } from "@/lib/domain/types";
import { EligibilityEngine } from "@/lib/eligibility/engine";
import { formatDeadline } from "@/lib/domain/values";
import { profileStore } from "@/lib/store/stores";
import { ReasonList, VerdictBadge } from "@/components/ui/opportunity";

const engine = new EligibilityEngine();

/** Runs the same deterministic engine in the browser, so public pages can show "your eligibility" instantly. */
export default function YourEligibility({ o }: { o: Opportunity }) {
  const profile = profileStore.useStore();
  const hydrated = profileStore.useHydrated();
  const result = useMemo(() => (profile ? engine.evaluate(profile, o) : null), [profile, o]);

  if (!hydrated) return <div className="card h-32 animate-pulse bg-subtle" />;

  if (!profile || !result) {
    return (
      <div className="card p-5">
        <p className="font-semibold">Are you eligible?</p>
        <p className="mt-1 text-sm text-muted">Answer a few questions and we&apos;ll check this and every other award for you.</p>
        <Link href="/onboarding" className="btn btn-secondary mt-4 w-full">
          Check my eligibility
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">Your eligibility</p>
        {result.failedLeafCount > 1 ? <span className="badge bg-subtle text-muted">Not a match</span> : <VerdictBadge verdict={result.verdict} />}
      </div>
      <div className="mt-4">
        <ReasonList reasons={result.reasons} />
      </div>
      {o.deadline.kind === "FIXED" && (
        <p className="mt-4 border-t border-line pt-3 text-xs text-muted">Deadline in your time: {formatDeadline(o.deadline, profile.timeZone)}</p>
      )}
    </div>
  );
}
