"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import CountryPicker from "@/components/ui/CountryPicker";
import { COUNTRY_BY_CODE, DESTINATIONS, FIELDS, LEVEL_LABEL, TESTS } from "@/lib/domain/reference";
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
const HOME_SUGGESTIONS = ["IN", "NG", "PK", "BD", "KE", "NP", "LK", "GH"];
const TARGET_LEVELS: Level[] = ["BACHELOR", "MASTER", "DOCTORATE", "DIPLOMA"];
/** We infer the current level from what they're applying for, to save a question. */
const CURRENT_FOR: Record<string, Level> = { BACHELOR: "SECONDARY", DIPLOMA: "SECONDARY", MASTER: "BACHELOR", DOCTORATE: "MASTER" };
const STEPS = ["Home", "Study", "Destinations", "Grades", "Finish"] as const;

type Draft = Omit<StudentProfile, "updatedAt">;

function initialDraft(): Draft {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
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
  const [draft, setDraft] = useState<Draft | null>(null);
  const [livesElsewhere, setLivesElsewhere] = useState(false);
  const [consent, setConsent] = useState<Record<ConsentPurpose, boolean>>({ MATCHING: false, REMINDERS: true, ANALYTICS: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialise from client-only data once
    setDraft((d) => d ?? (existing ? { ...existing } : initialDraft()));
  }, [existing]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const canNext = useMemo(() => {
    if (!draft) return false;
    if (step === 0) return draft.nationalities.length > 0 && !!draft.residenceCountry;
    if (step === 1) return draft.fields.length > 0;
    if (step === 2) return draft.targetCountries.length > 0;
    if (step === 4) return consent.MATCHING;
    return true;
  }, [draft, step, consent]);

  if (!draft) return <div className="min-h-[70vh]" />;

  const go = (d: number) => {
    setStep((s) => Math.min(STEPS.length - 1, Math.max(0, s + d)));
    window.scrollTo({ top: 0 });
  };

  const finish = async () => {
    setSaving(true);
    await recordConsents(consent);
    await saveProfile({ ...draft, updatedAt: new Date().toISOString() });
    router.push("/matches");
  };

  const setHome = (code: string) => {
    set("nationalities", [code]);
    if (!livesElsewhere) set("residenceCountry", code);
    const ccy = COUNTRY_BY_CODE[code]?.currency;
    if (ccy && hasRate(ccy)) set("currency", ccy);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Step {step + 1} of {STEPS.length}
        </span>
        {step === 3 && <span>Optional</span>}
      </div>
      <div className="mt-2 flex gap-1.5" aria-hidden>
        {STEPS.map((s, i) => (
          <span key={s} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`} />
        ))}
      </div>

      <div className="card mt-6 p-6 sm:p-8">
        {step === 0 && (
          <Step title="Where are you from?" sub="Many scholarships depend on your nationality.">
            <CountryPicker label="Nationality" value={draft.nationalities.slice(0, 1)} suggestions={HOME_SUGGESTIONS} onChange={(v) => v[0] && setHome(v[0])} />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#1d4ed8]"
                checked={livesElsewhere}
                onChange={(e) => {
                  setLivesElsewhere(e.target.checked);
                  if (!e.target.checked) set("residenceCountry", draft.nationalities[0]);
                }}
              />
              I live in a different country
            </label>
            {livesElsewhere && (
              <Field label="Where do you live now?">
                <CountryPicker label="Country of residence" value={[draft.residenceCountry]} suggestions={["AE", "US", "GB", "SG"]} onChange={(v) => v[0] && set("residenceCountry", v[0])} />
              </Field>
            )}
          </Step>
        )}

        {step === 1 && (
          <Step title="What do you want to study?" sub="Some awards are only for certain levels or subjects.">
            <Field label="I'm applying for a">
              <div className="flex flex-wrap gap-2">
                {TARGET_LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    className="chip"
                    aria-pressed={draft.targetLevel === l}
                    onClick={() => setDraft((d) => (d ? { ...d, targetLevel: l, currentLevel: CURRENT_FOR[l] } : d))}
                  >
                    {LEVEL_LABEL[l]}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Subject (pick up to 3)">
              <div className="flex flex-wrap gap-2">
                {FIELDS.map((f) => {
                  const on = draft.fields.includes(f.code);
                  return (
                    <button
                      key={f.code}
                      type="button"
                      className="chip"
                      aria-pressed={on}
                      onClick={() =>
                        set("fields", on ? draft.fields.filter((x) => x !== f.code) : draft.fields.length < 3 ? [...draft.fields, f.code] : draft.fields)
                      }
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          </Step>
        )}

        {step === 2 && (
          <Step title="Where do you want to study?" sub="Pick up to 5 countries. You can change this later.">
            <CountryPicker label="Study destinations" value={draft.targetCountries} max={5} suggestions={DESTINATIONS.slice(0, 8)} onChange={(v) => set("targetCountries", v)} />
          </Step>
        )}

        {step === 3 && (
          <Step title="Your grades" sub="Optional, but it helps us check merit scholarships. Use your own grading system.">
            <GradeInput value={draft.grade} onChange={(g) => set("grade", g)} />
            <Field label="English or entrance test scores (if you have them)">
              <div className="grid gap-3 sm:grid-cols-3">
                {TESTS.map((t) => (
                  <label key={t.code} className="text-sm">
                    <span className="mb-1 block text-muted">{t.label}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={t.min}
                      max={t.max}
                      step={t.step}
                      placeholder={`${t.min}–${t.max}`}
                      value={draft.tests[t.code] ?? ""}
                      onChange={(e) => {
                        const next = { ...draft.tests };
                        if (e.target.value === "") delete next[t.code];
                        else next[t.code] = Math.min(t.max, Math.max(t.min, Number(e.target.value)));
                        set("tests", next);
                      }}
                      className="input"
                    />
                  </label>
                ))}
              </div>
            </Field>
          </Step>
        )}

        {step === 4 && (
          <Step title="Almost done" sub="One optional question, then your results.">
            <Field label="How much help does your family need to pay for university? (optional)">
              <div className="flex flex-wrap gap-2">
                {([
                  ["LOW", "We can pay most costs"],
                  ["MEDIUM", "We need some help"],
                  ["HIGH", "We need a lot of help"],
                ] as const).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    className="chip"
                    aria-pressed={draft.financialNeed === v}
                    onClick={() => set("financialNeed", draft.financialNeed === v ? undefined : (v as FinancialNeed))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>

            <details className="rounded-lg border border-line p-4 text-sm">
              <summary className="cursor-pointer font-medium">More details (optional)</summary>
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="mb-1 block text-muted">Yearly household income ({draft.currency})</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={draft.householdIncome?.amount ?? ""}
                    onChange={(e) => set("householdIncome", e.target.value === "" ? undefined : { amount: Number(e.target.value), currency: draft.currency })}
                    className="input max-w-xs"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#1d4ed8]"
                    checked={draft.firstGeneration === true}
                    onChange={(e) => set("firstGeneration", e.target.checked ? true : undefined)}
                  />
                  I&apos;ll be the first in my family to go to university
                </label>
              </div>
            </details>

            <div className="space-y-3 border-t border-line pt-6">
              {([
                ["MATCHING", "Use my answers to find scholarships for me", "Required"],
                ["REMINDERS", "Remind me before deadlines I save", ""],
                ["ANALYTICS", "Share anonymous usage stats to improve the app", ""],
              ] as const).map(([k, t, s]) => (
                <label key={k} className="flex cursor-pointer items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-[#1d4ed8]"
                    checked={consent[k]}
                    onChange={(e) => setConsent((c) => ({ ...c, [k]: e.target.checked }))}
                  />
                  <span>
                    {t} {s && <span className="text-muted">· {s}</span>}
                  </span>
                </label>
              ))}
              <p className="flex items-center gap-2 pt-1 text-xs text-muted">
                <Lock className="h-3.5 w-3.5" /> We never sell your data or charge fees.
              </p>
            </div>
          </Step>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button type="button" onClick={() => go(-1)} className={`btn btn-ghost ${step === 0 ? "invisible" : ""}`}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={() => go(1)} disabled={!canNext} className="btn btn-primary">
            {step === 3 ? "Next (or skip)" : "Next"} <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={finish} disabled={!canNext || saving} className="btn btn-primary">
            {saving ? "Finding matches…" : "See my matches"} <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function Step({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-muted">{sub}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      {children}
    </div>
  );
}

function GradeInput({ value, onChange }: { value?: { scale: GradeScale; value: number }; onChange: (v: { scale: GradeScale; value: number } | undefined) => void }) {
  const [scale, setScale] = useState<GradeScale>(value?.scale ?? "PERCENT");
  const info = GRADE_SCALE_INFO[scale];
  return (
    <Field label="Your latest overall grade">
      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          aria-label="Grading system"
          value={scale}
          onChange={(e) => {
            const s = e.target.value as GradeScale;
            setScale(s);
            if (value) onChange({ scale: s, value: Math.min(value.value, GRADE_SCALE_INFO[s].max) });
          }}
          className="input sm:max-w-[14rem]"
        >
          {GRADE_SCALES.map((s) => (
            <option key={s} value={s}>
              {GRADE_SCALE_INFO[s].label}
            </option>
          ))}
        </select>
        <input
          type="number"
          inputMode="decimal"
          aria-label="Grade"
          min={0}
          max={info.max}
          step={info.step}
          placeholder={`0–${info.max}`}
          value={value?.value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : { scale, value: Math.min(info.max, Math.max(0, Number(e.target.value))) })}
          className="input sm:max-w-[10rem]"
        />
      </div>
      {value && <p className="mt-2 text-xs text-muted">≈ {normaliseGrade(scale, value.value)}% on our common scale</p>}
    </Field>
  );
}
