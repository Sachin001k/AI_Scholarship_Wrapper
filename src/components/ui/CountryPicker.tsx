"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { COUNTRIES, COUNTRY_BY_CODE } from "@/lib/domain/reference";

/**
 * Shows a short list of suggestions plus anything already selected; the full
 * list only appears when the student searches. Keeps the screen calm.
 */
export default function CountryPicker({
  value,
  onChange,
  max = 1,
  suggestions,
  label,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
  suggestions: string[];
  label: string;
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s) return COUNTRIES.filter((c) => c.name.toLowerCase().includes(s)).slice(0, 12).map((c) => c.code);
    return [...new Set([...value, ...suggestions])];
  }, [q, value, suggestions]);

  const toggle = (code: string) => {
    if (value.includes(code)) onChange(value.filter((c) => c !== code));
    else if (max === 1) onChange([code]);
    else if (value.length < max) onChange([...value, code]);
  };

  return (
    <div>
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {shown.map((code) => {
          const c = COUNTRY_BY_CODE[code];
          if (!c) return null;
          return (
            <button key={code} type="button" className="chip" aria-pressed={value.includes(code)} onClick={() => toggle(code)}>
              <span aria-hidden>{c.flag}</span> {c.name}
            </button>
          );
        })}
        {q && shown.length === 0 && <p className="text-sm text-muted">No country matches “{q}”.</p>}
      </div>
      <label className="relative mt-3 block max-w-xs">
        <span className="sr-only">Search {label}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search other countries" className="input pl-9 text-sm" />
      </label>
      {max > 1 && (
        <p className="mt-2 text-xs text-muted">
          {value.length} of {max} selected
        </p>
      )}
    </div>
  );
}
