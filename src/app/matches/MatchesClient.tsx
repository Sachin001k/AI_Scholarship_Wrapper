"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ArrowRight, Lightbulb, Pencil, SlidersHorizontal, Sparkles } from "lucide-react";
import clsx from "clsx";
import type { Verdict } from "@/lib/domain/types";
import { COUNTRY_BY_CODE, FIELD_LABEL, LEVEL_LABEL, countryName, flag } from "@/lib/domain/reference";
import { daysLeft } from "@/lib/domain/values";
import { attributeLabel } from "@/lib/eligibility/attributes";
import { profileStore } from "@/lib/store/stores";
import { useMatches } from "@/lib/store/use-matches";
import { CountUp } from "@/components/ui/motion";
import { OpportunityCard } from "@/components/ui/opportunity";
import Confetti from "@/components/ui/Confetti";

type Tab = "ALL" | Verdict;
type Sort = "best" | "deadline" | "amount";

export default function MatchesClient() {
  const profile = profileStore.useStore();
  const hydrated = profileStore.useHydrated();
  const { data, loading, error } = useMatches(profile);
  const [tab, setTab] = useState<Tab>("ALL");
  const [kind, setKind] = useState<"ALL" | "SCHOLARSHIP" | "LOAN">("ALL");
  const [country, setCountry] = useState("ALL");
  const [sort, setSort] = useState<Sort>("best");
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("fresh") && data?.totals.eligible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time celebration on first reveal
      setCelebrate(true);
      window.history.replaceState(null, "", "/matches");
      const t = setTimeout(() => setCelebrate(false), 2600);
      return () => clearTimeout(t);
    }
  }, [data]);

  const list = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    let l = data.matches.filter(
      (m) =>
        (tab === "ALL" || m.verdict === tab) &&
        (kind === "ALL" || m.opportunity.kind === kind) &&
        (country === "ALL" || m.opportunity.hostCountries.includes(country) || m.opportunity.hostCountries.includes("*")),
    );
    if (sort === "deadline") l = [...l].sort((a, b) => (daysLeft(a.opportunity.deadline, now) ?? 9999) - (daysLeft(b.opportunity.deadline, now) ?? 9999));
    if (sort === "amount") l = [...l].sort((a, b) => (b.localValue?.amount ?? 0) - (a.localValue?.amount ?? 0));
    return l;
  }, [data, tab, kind, country, sort]);

  if (!hydrated) return <div className="min-h-[70vh]" />;
  if (!profile) return <EmptyProfile />;

  const countries = [...new Set(data?.matches.flatMap((m) => m.opportunity.hostCountries).filter((c) => c !== "*") ?? [])];
  const t = data?.totals;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      {celebrate && <Confetti />}

      {/* ---------- Summary hero ---------- */}
      <section className="glass relative overflow-hidden rounded-[2rem] p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-violet/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-cyan/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-muted">{profile.name ? `Hey ${profile.name} 👋` : "Your personal matches"}</p>
            {loading || !t ? (
              <Scanning />
            ) : (
              <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-5xl">
                You qualify for <span className="text-gradient"><CountUp value={t.eligible} /> opportunities</span>
                {t.eligibleValue && (
                  <>
                    <br className="hidden sm:block" /> worth up to{" "}
                    <span className="text-gradient">
                      <CountUp value={t.eligibleValue.amount} currency={t.eligibleValue.currency} />
                    </span>
                    <span className="text-lg text-muted sm:text-2xl"> in awards you can apply for</span>
                  </>
                )}
              </h1>
            )}
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Pill>{profile.nationalities.map(flag).join(" ")} {profile.nationalities.map(countryName).join(" / ")}</Pill>
              <Pill>🎓 {LEVEL_LABEL[profile.targetLevel]}</Pill>
              <Pill>✈️ {profile.targetCountries.map((c) => COUNTRY_BY_CODE[c]?.flag).join(" ")}</Pill>
              <Pill>{profile.fields.map((f) => FIELD_LABEL[f]).join(", ")}</Pill>
              <Link href="/onboarding" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-white hover:bg-white/20">
                <Pencil className="h-3 w-3" /> Edit
              </Link>
            </div>
          </div>
          {t && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat n={t.eligible} label="Eligible" cls="text-ok" />
              <Stat n={t.needsInfo} label="Need info" cls="text-warn" />
              <Stat n={t.nearMiss} label="Near miss" cls="text-miss" />
            </div>
          )}
        </div>
      </section>

      {error && <p className="mt-6 rounded-2xl bg-miss/10 p-4 text-miss">Couldn&apos;t load matches: {error}</p>}

      {/* ---------- Missing info prompts ---------- */}
      {data && data.prompts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex flex-col gap-3 sm:flex-row">
          {data.prompts.slice(0, 2).map((p) => (
            <Link
              key={p.attr}
              href="/onboarding"
              className="group flex flex-1 items-center gap-3 rounded-2xl border border-warn/30 bg-warn/10 p-4 hover:bg-warn/15"
            >
              <Lightbulb className="h-5 w-5 shrink-0 text-warn" />
              <span className="text-sm">
                Add your <strong>{attributeLabel(p.attr)}</strong> to check{" "}
                <strong>{p.count} more</strong> {p.count === 1 ? "opportunity" : "opportunities"}
              </span>
              <ArrowRight className="ml-auto h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </motion.div>
      )}

      {/* ---------- Tabs + filters ---------- */}
      {data && (
        <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <LayoutGroup>
            <div role="tablist" className="flex gap-1 overflow-x-auto rounded-full bg-white/5 p-1 ring-1 ring-white/10">
              {([
                ["ALL", "All", data.matches.length],
                ["ELIGIBLE", "Eligible", t!.eligible],
                ["NEEDS_INFO", "Needs info", t!.needsInfo],
                ["NEAR_MISS", "Near miss", t!.nearMiss],
              ] as const).map(([k, label, n]) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className={clsx("relative whitespace-nowrap rounded-full px-4 py-2 text-sm", tab === k ? "text-white" : "text-muted hover:text-white")}
                >
                  {tab === k && <motion.span layoutId="tab-bg" className="absolute inset-0 rounded-full bg-gradient-to-r from-violet/70 to-cyan/50" />}
                  <span className="relative">
                    {label} <span className="opacity-70">{n}</span>
                  </span>
                </button>
              ))}
            </div>
          </LayoutGroup>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <SlidersHorizontal className="h-4 w-4 text-muted" aria-hidden />
            <Select label="Type" value={kind} onChange={(v) => setKind(v as typeof kind)} options={[["ALL", "All types"], ["SCHOLARSHIP", "Scholarships"], ["LOAN", "Loans"]]} />
            <Select label="Country" value={country} onChange={setCountry} options={[["ALL", "All countries"], ...countries.map((c) => [c, `${flag(c)} ${countryName(c)}`] as [string, string])]} />
            <Select label="Sort" value={sort} onChange={(v) => setSort(v as Sort)} options={[["best", "Best match"], ["deadline", "Deadline soonest"], ["amount", "Highest value"]]} />
          </div>
        </div>
      )}

      {/* ---------- Results grid ---------- */}
      <motion.div layout className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {list.map((m, i) => (
            <motion.div
              key={m.opportunity.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.4) }}
              className="h-full"
            >
              <OpportunityCard o={m.opportunity} verdict={m.verdict} reasons={m.reasons} localValue={m.localValue} zone={profile.timeZone} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      {data && list.length === 0 && (
        <p className="mt-10 text-center text-muted">Nothing here with these filters. Try “All”, or add more destinations to your profile.</p>
      )}

      {data && (
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <p className="text-muted">Know which program you want? See how your matches cover the full cost.</p>
          <Link href="/plan" className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white">
            Build my funding plan <ArrowRight className="h-4 w-4" />
          </Link>
          {data.source === "seed" && <p className="text-xs text-muted">Showing prototype sample data. Verify details on official sites.</p>}
        </div>
      )}
    </div>
  );
}

function Scanning() {
  return (
    <div className="mt-3 flex items-center gap-4">
      <div className="relative h-14 w-14">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border-2 border-cyan"
            initial={{ scale: 0.3, opacity: 1 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
        <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-cyan" />
      </div>
      <p className="font-display text-2xl font-bold sm:text-4xl">Checking every scholarship for you…</p>
    </div>
  );
}

function Stat({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <div className="rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
      <p className={clsx("font-display text-3xl font-bold", cls)}>
        <CountUp value={n} />
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white/5 px-3 py-1.5 text-white/80 ring-1 ring-white/10">{children}</span>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-cyan/60 focus:outline-none [&>option]:bg-ink"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyProfile() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-violet to-cyan">
        <Sparkles className="h-10 w-10 text-white" />
      </motion.div>
      <h1 className="mt-6 font-display text-3xl font-bold">Let&apos;s find your matches</h1>
      <p className="mt-2 text-muted">Answer a few quick questions (about 2 minutes). No account needed.</p>
      <Link href="/onboarding" className="btn-primary mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3 font-semibold text-white">
        Get started <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
