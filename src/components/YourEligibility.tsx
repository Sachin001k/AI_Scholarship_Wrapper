"use client";
import Link from "next/link";
import { useMemo } from "react";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import type { Opportunity } from "@/lib/domain/types";
import { EligibilityEngine } from "@/lib/eligibility/engine";
import { formatDeadline } from "@/lib/domain/values";
import { profileStore } from "@/lib/store/stores";
import { ReasonList, VerdictBadge } from "@/components/ui/opportunity";

const engine = new EligibilityEngine();

/**
 * Runs the same deterministic engine in the browser for the open page, so a
 * public page can show "your eligibility" instantly (no server round-trip).
 */
export default function YourEligibility({ o }: { o: Opportunity }) {
  const profile = profileStore.useStore();
  const hydrated = profileStore.useHydrated();
  const result = useMemo(() => (profile ? engine.evaluate(profile, o) : null), [profile, o]);

  if (!hydrated) return <div className="glass h-40 animate-pulse rounded-3xl" />;

  if (!profile || !result) {
    return (
      <div className="glass rounded-3xl p-6">
        <Sparkles className="h-6 w-6 text-gold" />
        <h2 className="mt-3 font-display text-lg font-semibold">Are you eligible?</h2>
        <p className="mt-1 text-sm text-muted">Answer a few questions and we&apos;ll check this and every other award for you.</p>
        <Link href="/onboarding" className="mt-4 inline-block rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20">
          Check my eligibility →
        </Link>
      </div>
    );
  }

  const failed = result.failedLeafCount > 1;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-6">
      <p className="text-xs uppercase tracking-wider text-muted">Your eligibility</p>
      <div className="mt-2">
        {failed ? (
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-muted">Not a match for your profile</span>
        ) : (
          <VerdictBadge verdict={result.verdict} />
        )}
      </div>
      <div className="mt-4">
        <ReasonList reasons={result.reasons} />
      </div>
      {o.deadline.kind === "FIXED" && (
        <p className="mt-4 text-xs text-muted">Deadline in your time: {formatDeadline(o.deadline, profile.timeZone)}</p>
      )}
    </motion.div>
  );
}
