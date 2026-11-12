"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bookmark, Check, ChevronDown, CircleHelp, Clock, X } from "lucide-react";
import clsx from "clsx";
import type { Money, Opportunity, Verdict, ZonedDeadline } from "@/lib/domain/types";
import { daysLeft, formatCompactMoney, formatDeadline } from "@/lib/domain/values";
import type { Reason } from "@/lib/eligibility/rules";
import { savedStore, toggleSaved } from "@/lib/store/stores";

export const BASIS_LABEL: Record<string, string> = {
  MERIT: "Merit-based",
  NEED: "Need-based",
  MERIT_AND_NEED: "Merit + need",
  UNIVERSITY_SPECIFIC: "University award",
  FIELD_SPECIFIC: "Subject-specific",
  COUNTRY_SPECIFIC: "Country-specific",
};

export const opportunityHref = (o: Pick<Opportunity, "kind" | "slug">) =>
  `/${o.kind === "LOAN" ? "loans" : "scholarships"}/${o.slug}`;

const VERDICT = {
  ELIGIBLE: { label: "Eligible", icon: Check, cls: "bg-ok-soft text-ok" },
  NEEDS_INFO: { label: "Needs info", icon: CircleHelp, cls: "bg-warn-soft text-warn" },
  NEAR_MISS: { label: "Almost", icon: X, cls: "bg-miss-soft text-miss" },
} as const;

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const v = VERDICT[verdict];
  return (
    <span className={clsx("badge", v.cls)}>
      <v.icon className="h-3.5 w-3.5" aria-hidden /> {v.label}
    </span>
  );
}

/** Days-left label, computed in the browser only (avoids server/client clock mismatch). */
export function DeadlineChip({ deadline, zone }: { deadline: ZonedDeadline; zone?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- read the clock after hydration only
  useEffect(() => setNow(new Date()), []);
  if (deadline.kind === "ROLLING") return <span className="text-xs text-muted">Apply anytime</span>;
  const d = now ? daysLeft(deadline, now) : null;
  return (
    <span
      className={clsx("inline-flex items-center gap-1 text-xs", d !== null && d <= 30 ? "font-semibold text-warn" : "text-muted")}
      title={now ? formatDeadline(deadline, zone) : undefined}
    >
      <Clock className="h-3.5 w-3.5" aria-hidden />
      {d === null ? "…" : d < 0 ? "Closed" : d === 0 ? "Closes today" : `${d} days left`}
    </span>
  );
}

export function SaveButton({ o, className }: { o: Pick<Opportunity, "slug" | "kind" | "title">; className?: string }) {
  const saved = !!savedStore.useStore()[o.slug];
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSaved({ slug: o.slug, kind: o.kind, title: o.title });
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${o.title} from saved` : `Save ${o.title}`}
      title={saved ? "Saved" : "Save"}
      className={clsx(
        "relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors",
        saved ? "bg-brand-soft text-brand" : "text-muted hover:bg-subtle hover:text-ink",
        className,
      )}
    >
      <Bookmark className="h-5 w-5" fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

export function SampleBadge() {
  return (
    <span className="badge bg-subtle text-muted" title="Prototype sample data — check the official site">
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
            <span>{r.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Compact card: what it is, who gives it, how much, how long left. Details live on the detail page. */
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
  const typeLabel = o.kind === "LOAN" ? "Loan" : (BASIS_LABEL[o.basis ?? ""] ?? "Scholarship");

  return (
    <article className="card card-link relative flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {verdict && <VerdictBadge verdict={verdict} />}
          <span className="text-xs text-muted">{typeLabel}</span>
        </div>
        <SaveButton o={o} className="-mr-2 -mt-2" />
      </div>

      <h3 className="mt-2 text-base font-semibold leading-snug">
        <Link href={opportunityHref(o)} className="after:absolute after:inset-0 hover:text-brand">
          {o.title}
        </Link>
      </h3>
      <p className="mt-1 text-sm text-muted">{o.provider.name}</p>

      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <p className="text-lg font-semibold">
          {value ? (
            <>
              {o.kind === "LOAN" && <span className="text-sm font-normal text-muted">up to </span>}
              {formatCompactMoney(value)}
            </>
          ) : (
            <span className="text-sm font-normal text-muted">Amount varies</span>
          )}
        </p>
        <DeadlineChip deadline={o.deadline} zone={zone} />
      </div>

      {reasons && reasons.length > 0 && (
        <div className="relative z-10 mt-4 border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand"
            aria-expanded={open}
          >
            {verdict === "ELIGIBLE" ? "Why you match" : "What's missing"}
            <ChevronDown className={clsx("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>
          {open && (
            <div className="pt-3">
              <ReasonList reasons={reasons} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}
