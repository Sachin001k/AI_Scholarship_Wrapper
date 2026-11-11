"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Lock, Sparkles } from "lucide-react";
import clsx from "clsx";
import Globe from "@/components/three/Globe";
import CountryPicker from "@/components/ui/CountryPicker";
import { COUNTRY_BY_CODE, FIELDS, LEVEL_LABEL, TESTS } from "@/lib/domain/reference";
import { GRADE_SCALE_INFO, normaliseGrade } from "@/lib/domain/values";
import { GRADE_SCALES, type FinancialNeed, type GradeScale, type Level, type StudentProfile } from "@/lib/domain/types";
import { profileStore } from "@/lib/store/stores";
import { saveProfile } from "@/lib/store/session";
import { recordConsents, type ConsentPurpose } from "@/lib/store/consent";
import { hasRate } from "@/lib/funding/fx";

const ZONE_COUNTRY: Record<string, string> = {
  "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Europe/London": "GB", "Asia/Singapore": "SG", "Africa/Lagos": "NG",
  "Africa/Nairobi": "KE", "Asia/Karachi": "PK", "Asia/Dhaka": "BD", "Asia/Colombo": "LK", "Asia/Kathmandu": "NP",
  "Europe/Berlin": "DE", "Asia/Tokyo": "JP", "Africa/Accra": "GH", "Asia/Jakarta": "ID", "Asia/Manila": "PH",
  "Asia/Ho_Chi_Minh": "VN", "Asia/Shanghai": "CN", "Africa/Johannesburg": "ZA", "Africa/Cairo": "EG", "Asia/Dubai": "AE",
  "America/Sao_Paulo": "BR", "America/Mexico_City": "MX", "America/Toronto": "CA", "America/Vancouver": "CA",
};

const STEPS = ["You", "Study plans", "Subjects", "Grades", "Money", "Privacy"] as const;
const TARGET_LEVELS: Level[] = ["BACHELOR", "MASTER", "DOCTORATE", "DIPLOMA"];
const CURRENT_LEVELS: Level[] = ["SECONDARY", "DIPLOMA", "BACHELOR", "MASTER"];

type Draft = Omit<StudentProfile, "version" | "updatedAt"> & { version: number };

function initialDraft(): Draft {
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  const guess = ZONE_COUNTRY[tz] ?? (tz.startsWith("America/") ? "US" : tz.startsWith("Australia/") ? "AU" : "IN");
  const ccy = COUNTRY_BY_CODE[guess]?.currency ?? "USD";
  return {
    version: 0,
    nationalities: [guess],
    residenceCountry: guess,
    currentLevel: "SECONDARY",
    targetLevel: "BACHELOR",
    targetCountries: [],
    fields: [],
    tests: {},
    admittedPrograms: [],
    currency: hasRate(ccy) ? ccy : "USD",
    timeZone: tz,
  };
}

export default function OnboardingWizard() {
  const router = useRouter();
  const existing = profileStore.useStore();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [consent, setConsent] = useState<Record<ConsentPurpose, boolean>>({ MATCHING: false, REMINDERS: true, ANALYTICS: false });
  const [saving, setSaving] = useState(false);

  // Start from the saved profile when editing, else from browser-detected defaults.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialise from client-only data once
    setDraft((d) => d ?? (existing ? { ...existing } : initialDraft()));
  }, [existing]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const canNext = useMemo(() => {
    if (!draft) return false;
    switch (step) {
      case 0: return draft.nationalities.length > 0 && !!draft.residenceCountry;
      case 1: return draft.targetCountries.length > 0;
      case 2: return draft.fields.length > 0;
      case 5: return consent.MATCHING;
      default: return true;
    }
  }, [draft, step, consent]);

  if (!draft) return <div className="min-h-[70vh]" />;

  const go = (d: number) => {
    setDir(d);
    setStep((s) => Math.min(STEPS.length - 1, Math.max(0, s + d)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const finish = async () => {
    setSaving(true);
    await recordConsents(consent);
    await saveProfile({ ...draft, updatedAt: new Date().toISOString() });
    router.push("/matches?fresh=1");
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_1fr] lg:gap-10 lg:py-10">
      {/* Globe preview: arcs update as you choose destinations */}
      <div className="relative h-56 sm:h-72 lg:sticky lg:top-24 lg:order-2 lg:h-[600px]">
        <Globe home={draft.residenceCountry} targets={draft.targetCountries} decorations={false} />
        <AnimatePresence>
          {draft.targetCountries.length > 0 && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/50 px-4 py-1.5 text-xs text-white/80 backdrop-blur"
            >
              {COUNTRY_BY_CODE[draft.residenceCountry]?.flag} → {draft.targetCountries.map((c) => COUNTRY_BY_CODE[c]?.flag).join(" ")}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="lg:order-1">
        {/* Progress */}
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Step {step + 1} of {STEPS.length} · {STEPS[step]}</span>
          <span>{step >= 3 && step <= 4 ? "Optional — skip anytime" : ""}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet via-cyan to-lime"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>

        <div className="glass relative mt-6 min-h-[460px] overflow-hidden rounded-3xl p-6 sm:p-8">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 && (
                <Step title="Hi! Where are you from?" sub="Many scholarships depend on your nationality. Dual citizen? Pick both.">
                  <Field label="Your first name (optional)">
                    <input
                      value={draft.name ?? ""}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="e.g. Aisha"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 focus:border-cyan/60 focus:outline-none"
                    />
                  </Field>
                  <Field label="Nationality">
                    <CountryPicker label="Nationality" value={draft.nationalities} max={2} onChange={(v) => set("nationalities", v)} />
                  </Field>
                  <Field label="Where do you live now?">
                    <CountryPicker
                      label="Country of residence"
                      value={[draft.residenceCountry]}
                      onChange={(v) => {
                        if (!v[0]) return;
                        set("residenceCountry", v[0]);
                        const ccy = COUNTRY_BY_CODE[v[0]]?.currency;
                        if (ccy && hasRate(ccy)) set("currency", ccy);
                      }}
                    />
                  </Field>
                </Step>
              )}

              {step === 1 && (
                <Step title="What's the plan?" sub="Pick the level you're applying for and up to 5 countries.">
                  <Field label="I'm currently in">
                    <Chips options={CURRENT_LEVELS.map((l) => ({ v: l, label: LEVEL_LABEL[l] }))} value={[draft.currentLevel]} onChange={(v) => set("currentLevel", v[0] as Level)} />
                  </Field>
                  <Field label="I want to study for a">
                    <Chips options={TARGET_LEVELS.map((l) => ({ v: l, label: LEVEL_LABEL[l] }))} value={[draft.targetLevel]} onChange={(v) => set("targetLevel", v[0] as Level)} />
                  </Field>
                  <Field label="Where do you want to study?">
                    <CountryPicker label="Study destinations" value={draft.targetCountries} max={5} destinationsFirst onChange={(v) => set("targetCountries", v)} />
                  </Field>
                </Step>
              )}

              {step === 2 && (
                <Step title="What do you love?" sub="Choose up to 3 fields. Some awards are only for certain subjects.">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {FIELDS.map((f) => {
                      const on = draft.fields.includes(f.code);
                      return (
                        <motion.button
                          key={f.code}
                          type="button"
                          whileHover={{ y: -3 }}
                          whileTap={{ scale: 0.96 }}
                          aria-pressed={on}
                          onClick={() =>
                            set("fields", on ? draft.fields.filter((x) => x !== f.code) : draft.fields.length < 3 ? [...draft.fields, f.code] : draft.fields)
                          }
                          className={clsx(
                            "flex flex-col items-start gap-2 rounded-2xl p-4 text-left ring-1 transition-colors",
                            on ? "bg-gradient-to-br from-violet/40 to-cyan/20 ring-violet" : "bg-white/5 ring-white/10 hover:bg-white/10",
                          )}
                        >
                          <span className="text-2xl" aria-hidden>{f.emoji}</span>
                          <span className="text-sm font-medium">{f.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </Step>
              )}

              {step === 3 && (
                <Step title="How are your grades?" sub="Use your own system — we convert it. Test scores unlock more awards.">
                  <GradeInput value={draft.grade} onChange={(g) => set("grade", g)} />
                  <Field label="Test scores (tap to add)">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {TESTS.map((t) => {
                          const on = t.code in draft.tests;
                          return (
                            <button
                              key={t.code}
                              type="button"
                              aria-pressed={on}
                              onClick={() => {
                                const next = { ...draft.tests };
                                if (on) delete next[t.code];
                                else next[t.code] = Math.round(((t.min + t.max) * 0.75) / t.step) * t.step;
                                set("tests", next);
                              }}
                              className={clsx("rounded-full px-3.5 py-2 text-sm ring-1", on ? "bg-cyan/20 ring-cyan" : "bg-white/5 ring-white/10")}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                      {TESTS.filter((t) => t.code in draft.tests).map((t) => (
                        <Slider
                          key={t.code}
                          label={t.label}
                          min={t.min}
                          max={t.max}
                          step={t.step}
                          value={draft.tests[t.code]}
                          onChange={(v) => set("tests", { ...draft.tests, [t.code]: v })}
                        />
                      ))}
                    </div>
                  </Field>
                </Step>
              )}

              {step === 4 && (
                <Step title="Money matters (optional)" sub="Need-based awards ask about this. It stays private and you can skip it.">
                  <Field label="How much help does your family need to pay for university?">
                    <Chips
                      options={[
                        { v: "LOW", label: "We can pay most costs" },
                        { v: "MEDIUM", label: "We need some help" },
                        { v: "HIGH", label: "We need a lot of help" },
                      ]}
                      value={draft.financialNeed ? [draft.financialNeed] : []}
                      onChange={(v) => set("financialNeed", v[0] as FinancialNeed | undefined)}
                      allowNone
                    />
                  </Field>
                  <Field label={`Yearly household income (${draft.currency}, optional)`}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={draft.householdIncome?.amount ?? ""}
                      onChange={(e) =>
                        set("householdIncome", e.target.value === "" ? undefined : { amount: Number(e.target.value), currency: draft.currency })
                      }
                      placeholder="Leave blank to skip"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 focus:border-cyan/60 focus:outline-none"
                    />
                  </Field>
                  <Field label="Will you be the first in your family to go to university?">
                    <Chips
                      options={[{ v: "yes", label: "Yes" }, { v: "no", label: "No" }]}
                      value={draft.firstGeneration === undefined ? [] : [draft.firstGeneration ? "yes" : "no"]}
                      onChange={(v) => set("firstGeneration", v[0] === undefined ? undefined : v[0] === "yes")}
                      allowNone
                    />
                  </Field>
                </Step>
              )}

              {step === 5 && (
                <Step title="Your data, your choice" sub="We only use what you allow. Change this anytime.">
                  <div className="space-y-3">
                    {([
                      ["MATCHING", "Use my answers to find scholarships and loans for me", "Required to show matches"],
                      ["REMINDERS", "Remind me before deadlines I save", "Email, in your time zone"],
                      ["ANALYTICS", "Help improve the app with anonymous usage stats", "Optional"],
                    ] as const).map(([k, t, s]) => (
                      <label key={k} className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 hover:bg-white/10">
                        <input
                          type="checkbox"
                          className="mt-1 h-5 w-5 accent-violet-500"
                          checked={consent[k]}
                          onChange={(e) => setConsent((c) => ({ ...c, [k]: e.target.checked }))}
                        />
                        <span>
                          <span className="block font-medium">{t}</span>
                          <span className="text-sm text-muted">{s}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="flex items-center gap-2 text-xs text-muted">
                    <Lock className="h-3.5 w-3.5" /> We never sell your data, charge fees, or ask for bank passwords.
                  </p>
                </Step>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={step === 0}
            className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-muted hover:text-white disabled:opacity-0"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => go(1)}
              disabled={!canNext}
              className="btn-primary inline-flex items-center gap-2 rounded-full px-7 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {step >= 3 && step <= 4 ? "Next (or skip)" : "Next"} <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={!canNext || saving}
              className="btn-primary inline-flex items-center gap-2 rounded-full px-7 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles className="h-4 w-4" /> {saving ? "Finding…" : "Show my matches"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- small building blocks ----------

function Step({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-1 text-muted">{sub}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-white/90">{label}</p>
      {children}
    </div>
  );
}

function Chips({
  options,
  value,
  onChange,
  allowNone,
}: {
  options: { v: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  allowNone?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.v);
        return (
          <motion.button
            key={o.v}
            type="button"
            whileTap={{ scale: 0.95 }}
            aria-pressed={on}
            onClick={() => onChange(on && allowNone ? [] : [o.v])}
            className={clsx("rounded-full px-4 py-2.5 text-sm ring-1 transition-colors", on ? "bg-violet/30 ring-violet" : "bg-white/5 ring-white/10 hover:bg-white/10")}
          >
            {o.label}
          </motion.button>
        );
      })}
    </div>
  );
}

function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
      <span className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-display text-lg font-bold text-gradient">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-cyan-400"
        style={{ background: `linear-gradient(90deg,#22d3ee ${pct}%,transparent ${pct}%)` }}
      />
    </label>
  );
}

function GradeInput({ value, onChange }: { value?: { scale: GradeScale; value: number }; onChange: (v: { scale: GradeScale; value: number } | undefined) => void }) {
  const scale = value?.scale ?? "PERCENT";
  const info = GRADE_SCALE_INFO[scale];
  return (
    <Field label="Your latest overall grade">
      <div className="flex flex-wrap gap-2">
        {GRADE_SCALES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={s === scale}
            onClick={() => onChange({ scale: s, value: Math.round(GRADE_SCALE_INFO[s].max * 0.8 * 100) / 100 })}
            className={clsx("rounded-full px-3.5 py-2 text-sm ring-1", s === scale && value ? "bg-violet/30 ring-violet" : "bg-white/5 ring-white/10")}
          >
            {GRADE_SCALE_INFO[s].label}
          </button>
        ))}
      </div>
      {value && (
        <div className="mt-3">
          <Slider label={info.label} min={0} max={info.max} step={info.step} value={value.value} onChange={(v) => onChange({ scale, value: v })} />
          <p className="mt-2 text-xs text-muted">
            ≈ <strong className="text-white">{normaliseGrade(scale, value.value)}</strong> on our common 0–100 scale
          </p>
        </div>
      )}
    </Field>
  );
}
