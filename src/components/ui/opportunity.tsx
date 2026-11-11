"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Banknote, Check, CircleHelp, Clock, Heart, Landmark, X } from "lucide-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import type { Money, Opportunity, Verdict, ZonedDeadline } from "@/lib/domain/types";
import { daysLeft, formatCompactMoney, formatDeadline } from "@/lib/domain/values";
import { flag } from "@/lib/domain/reference";
import type { Reason } from "@/lib/eligibility/rules";
import { savedStore, toggleSaved } from "@/lib/store/stores";
import { TiltCard } from "./motion";

export const BASIS_LABEL: Record<string, string> = {
  MERIT: "Merit-based",
  NEED: "Need-based",
  MERIT_AND_NEED: "Merit + need",
  UNIVERSITY_SPECIFIC: "University-specific",
  FIELD_SPECIFIC: "Field-specific",
  COUNTRY_SPECIFIC: "Country-specific",
};

export const opportunityHref = (o: Pick<Opportunity, "kind" | "slug">) =>
  `/${o.kind === "LOAN" ? "loans" : "scholarships"}/${o.slug}`;

const VERDICT = {
  ELIGIBLE: { label: "You're eligible", icon: Check, cls: "bg-ok/15 text-ok ring-ok/30" },
  NEEDS_INFO: { label: "Needs more info", icon: CircleHelp, cls: "bg-warn/15 text-warn ring-warn/30" },
  NEAR_MISS: { label: "Near miss", icon: AlertTriangle, cls: "bg-miss/15 text-miss ring-miss/30" },
} as const;

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const v = VERDICT[verdict];
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1", v.cls)}>
      <v.icon className="h-3.5 w-3.5" aria-hidden /> {v.label}
    </span>
  );
}

/** Deadline chip with a live countdown in the student's time zone (client only). */
export function DeadlineChip({ deadline, zone }: { deadline: ZonedDeadline; zone?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- read the clock after hydration only
  useEffect(() => setNow(new Date()), []);
  if (deadline.kind === "ROLLING")
    return <span className="inline-flex items-center gap-1 text-xs text-muted"><Clock className="h-3.5 w-3.5" /> Rolling</span>;
  const d = now ? daysLeft(deadline, now) : null;
  const urgent = d !== null && d <= 30;
  return (
    <span
      className={clsx("inline-flex items-center gap-1 text-xs", urgent ? "font-semibold text-warn" : "text-muted")}
      title={now ? formatDeadline(deadline, zone) : undefined}
    >
      <Clock className="h-3.5 w-3.5" aria-hidden />
      {d === null ? "…" : d < 0 ? "Closed" : d === 0 ? "Closes today" : `${d} days left`}
    </span>
  );
}

/** Heart button with a little particle burst. */
export function SaveButton({ o, className }: { o: Pick<Opportunity, "slug" | "kind" | "title">; className?: string }) {
  const saved = !!savedStore.useStore()[o.slug];
  const [burst, setBurst] = useState(0);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!saved) setBurst((b) => b + 1);
        toggleSaved({ slug: o.slug, kind: o.kind, title: o.title });
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${o.title} from saved` : `Save ${o.title}`}
      className={clsx(
        "relative grid h-10 w-10 place-items-center rounded-full ring-1 transition-colors",
        saved ? "bg-miss/20 text-miss ring-miss/40" : "bg-white/5 text-muted ring-white/10 hover:text-white",
        className,
      )}
    >
      <motion.span key={saved ? "on" : "off"} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
        <Heart className="h-5 w-5" fill={saved ? "currentColor" : "none"} />
      </motion.span>
      <AnimatePresence>
        {burst > 0 &&
          Array.from({ length: 8 }).map((_, i) => (
            <motion.span
              key={`${burst}-${i}`}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{ background: ["#f472b6", "#facc15", "#22d3ee", "#a3e635"][i % 4] }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: Math.cos((i / 8) * Math.PI * 2) * 26, y: Math.sin((i / 8) * Math.PI * 2) * 26, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          ))}
      </AnimatePresence>
    </button>
  );
}

export function SampleBadge() {
  return (
    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted ring-1 ring-white/10" title="Prototype sample data — verify on the official site">
      Sample data
    </span>
  );
}

export function ReasonList({ reasons }: { reasons: Reason[] }) {
  const icon = { PASS: Check, FAIL: X, UNKNOWN: CircleHelp };
  const color = { PASS: "text-ok", FAIL: "text-miss", UNKNOWN: "text-warn" };
  return (
    <ul className="space-y-1.5">
      {reasons.map((r, i) => {
        const I = icon[r.status];
        return (
          <li key={i} className="flex items-start gap-2 text-sm">
            <I className={clsx("mt-0.5 h-4 w-4 shrink-0", color[r.status])} aria-label={r.status.toLowerCase()} />
            <span className="text-white/85">{r.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function OpportunityCard({
  o,
  verdict,
  reasons,
  localValue,
  zone,
}: {
  o: Opportunity;
  verdict?: Verdict;
  reasons?: Reason[];
  localValue?: Money | null;
  zone?: string;
}) {
  const [open, setOpen] = useState(false);
  const value = localValue ?? o.award?.amount ?? o.loanTerms?.maxAmount;
  const Icon = o.kind === "LOAN" ? Landmark : Banknote;

  return (
    <TiltCard className="group relative h-full rounded-3xl">
      <div className="glass relative flex h-full flex-col overflow-hidden rounded-3xl p-5 transition-colors group-hover:border-white/20">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-30 blur-3xl"
          style={{ background: o.kind === "LOAN" ? "#22d3ee" : "#8b5cf6" }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {verdict && <VerdictBadge verdict={verdict} />}
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-muted ring-1 ring-white/10">
              <Icon className="h-3.5 w-3.5" /> {o.kind === "LOAN" ? "Loan" : (BASIS_LABEL[o.basis ?? ""] ?? "Scholarship")}
            </span>
          </div>
          <SaveButton o={o} />
        </div>

        <Link href={opportunityHref(o)} className="relative mt-4 block">
          <h3 className="font-display text-lg font-semibold leading-snug text-white group-hover:text-gradient">{o.title}</h3>
          <p className="mt-1 text-sm text-muted">
            {flag(o.provider.country)} {o.provider.name}
          </p>
          <p className="mt-3 line-clamp-2 text-sm text-white/75">{o.summary}</p>
          <span className="absolute inset-0" aria-hidden />
        </Link>

        <div className="relative mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            {value && (
              <p className="font-display text-2xl font-bold text-gradient">
                {o.kind === "LOAN" ? "up to " : ""}
                {formatCompactMoney(value)}
              </p>
            )}
            <p className="text-xs text-muted">{o.kind === "LOAN" ? `${o.loanTerms?.rateMinPct}–${o.loanTerms?.rateMaxPct}% interest` : o.award?.coverage}</p>
          </div>
          <DeadlineChip deadline={o.deadline} zone={zone} />
        </div>

        {reasons && reasons.length > 0 && (
          <div className="relative mt-4 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-sm font-medium text-cyan hover:underline"
              aria-expanded={open}
            >
              {open ? "Hide" : verdict === "ELIGIBLE" ? "Why you match" : "What's missing"}
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3">
                    <ReasonList reasons={reasons} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </TiltCard>
  );
}
