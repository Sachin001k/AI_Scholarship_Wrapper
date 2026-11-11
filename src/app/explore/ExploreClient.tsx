"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search } from "lucide-react";
import clsx from "clsx";
import type { Opportunity } from "@/lib/domain/types";
import { countryName, flag } from "@/lib/domain/reference";
import { BASIS_LABEL, OpportunityCard } from "@/components/ui/opportunity";

export default function ExploreClient({ opportunities }: { opportunities: Opportunity[] }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"ALL" | "SCHOLARSHIP" | "LOAN">("ALL");
  const [basis, setBasis] = useState("ALL");
  const [country, setCountry] = useState("ALL");

  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get("kind");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync initial filter from URL
    if (k === "LOAN" || k === "SCHOLARSHIP") setKind(k);
  }, []);

  const countries = useMemo(
    () => [...new Set(opportunities.flatMap((o) => o.hostCountries).filter((c) => c !== "*"))].sort(),
    [opportunities],
  );

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return opportunities.filter(
      (o) =>
        (kind === "ALL" || o.kind === kind) &&
        (basis === "ALL" || o.basis === basis) &&
        (country === "ALL" || o.hostCountries.includes(country) || o.hostCountries.includes("*")) &&
        (!s || `${o.title} ${o.provider.name} ${o.summary}`.toLowerCase().includes(s)),
    );
  }, [opportunities, q, kind, basis, country]);

  return (
    <>
      <div className="glass sticky top-20 z-20 mt-8 flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Chevening, Oxford, no-cosigner loan…"
            className="w-full rounded-xl bg-white/5 py-2.5 pl-9 pr-3 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-cyan/60"
          />
        </label>
        <div className="flex gap-1 rounded-xl bg-white/5 p-1">
          {(["ALL", "SCHOLARSHIP", "LOAN"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={clsx("rounded-lg px-3 py-1.5 text-sm", kind === k ? "bg-violet/50 text-white" : "text-muted hover:text-white")}
            >
              {k === "ALL" ? "All" : k === "LOAN" ? "Loans" : "Scholarships"}
            </button>
          ))}
        </div>
        <select aria-label="Type of scholarship" value={basis} onChange={(e) => setBasis(e.target.value)} className="rounded-xl bg-white/5 px-3 py-2 text-sm [&>option]:bg-ink">
          <option value="ALL">Any basis</option>
          {Object.entries(BASIS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select aria-label="Study country" value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-xl bg-white/5 px-3 py-2 text-sm [&>option]:bg-ink">
          <option value="ALL">Any country</option>
          {countries.map((c) => (
            <option key={c} value={c}>{flag(c)} {countryName(c)}</option>
          ))}
        </select>
      </div>

      <p className="mt-6 text-sm text-muted">{list.length} results</p>
      <motion.div layout className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {list.map((o) => (
            <motion.div key={o.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="h-full">
              <OpportunityCard o={o} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
