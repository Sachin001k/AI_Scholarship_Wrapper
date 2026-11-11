"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import clsx from "clsx";
import { motion } from "motion/react";
import { COUNTRIES, DESTINATIONS } from "@/lib/domain/reference";

/** Searchable chip grid for picking one or more countries. */
export default function CountryPicker({
  value,
  onChange,
  max = 1,
  destinationsFirst = false,
  label,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
  destinationsFirst?: boolean;
  label: string;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const sorted = destinationsFirst
      ? [...COUNTRIES].sort((a, b) => {
          const ia = DESTINATIONS.indexOf(a.code);
          const ib = DESTINATIONS.indexOf(b.code);
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.name.localeCompare(b.name);
        })
      : [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
    const s = q.trim().toLowerCase();
    return s ? sorted.filter((c) => c.name.toLowerCase().includes(s) || c.code.toLowerCase() === s) : sorted;
  }, [q, destinationsFirst]);

  const toggle = (code: string) => {
    if (value.includes(code)) onChange(value.filter((c) => c !== code));
    else if (max === 1) onChange([code]);
    else if (value.length < max) onChange([...value, code]);
  };

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Search {label}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search countries…"
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm placeholder:text-muted focus:border-cyan/60 focus:outline-none"
        />
      </label>
      <div role="group" aria-label={label} className="mt-3 flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1">
        {list.map((c) => {
          const on = value.includes(c.code);
          return (
            <motion.button
              key={c.code}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => toggle(c.code)}
              aria-pressed={on}
              className={clsx(
                "flex items-center gap-1.5 rounded-full px-3 py-2 text-sm ring-1 transition-colors",
                on ? "bg-violet/30 text-white ring-violet" : "bg-white/5 text-white/80 ring-white/10 hover:bg-white/10",
              )}
            >
              <span aria-hidden>{c.flag}</span> {c.name}
            </motion.button>
          );
        })}
      </div>
      {max > 1 && <p className="mt-2 text-xs text-muted">{value.length}/{max} selected</p>}
    </div>
  );
}
