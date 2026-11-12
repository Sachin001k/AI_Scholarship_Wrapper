"use client";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import clsx from "clsx";
import type { Opportunity } from "@/lib/domain/types";
import { countryName } from "@/lib/domain/reference";
import { OpportunityCard } from "@/components/ui/opportunity";

export default function ExploreClient({ opportunities }: { opportunities: Opportunity[] }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"ALL" | "SCHOLARSHIP" | "LOAN">("ALL");
  const [country, setCountry] = useState("ALL");

  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get("kind");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync initial filter from URL
    if (k === "LOAN" || k === "SCHOLARSHIP") setKind(k);
  }, []);

  const countries = useMemo(
    () => [...new Set(opportunities.flatMap((o) => o.hostCountries).filter((c) => c !== "*"))].sort((a, b) => countryName(a).localeCompare(countryName(b))),
    [opportunities],
  );

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return opportunities.filter(
      (o) =>
        (kind === "ALL" || o.kind === kind) &&
        (country === "ALL" || o.hostCountries.includes(country) || o.hostCountries.includes("*")) &&
        (!s || `${o.title} ${o.provider.name}`.toLowerCase().includes(s)),
    );
  }, [opportunities, q, kind, country]);

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or provider" className="input pl-9" />
        </label>
        <div className="flex gap-1 rounded-lg bg-subtle p-1 text-sm">
          {(["ALL", "SCHOLARSHIP", "LOAN"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={clsx("rounded-md px-3 py-1.5", kind === k ? "bg-surface font-medium shadow-sm" : "text-muted")}
            >
              {k === "ALL" ? "All" : k === "LOAN" ? "Loans" : "Scholarships"}
            </button>
          ))}
        </div>
        <select aria-label="Study country" value={country} onChange={(e) => setCountry(e.target.value)} className="input sm:w-48">
          <option value="ALL">Any country</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {countryName(c)}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-6 text-sm text-muted">{list.length} results</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((o) => (
          <OpportunityCard key={o.id} o={o} />
        ))}
      </div>
    </>
  );
}
