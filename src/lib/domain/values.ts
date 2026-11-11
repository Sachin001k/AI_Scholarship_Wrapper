/**
 * Value-object helpers: Money, ZonedDeadline, grade normalisation
 * (design doc §6.4).
 */
import type { GradeScale, Money, ZonedDeadline } from "./types";

// ---------- Money ----------

export function formatMoney(m: Money, locale = "en"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: m.currency,
      maximumFractionDigits: 0,
    }).format(m.amount);
  } catch {
    return `${m.currency} ${Math.round(m.amount).toLocaleString(locale)}`;
  }
}

export function formatCompactMoney(m: Money, locale = "en"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: m.currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(m.amount);
  } catch {
    return formatMoney(m, locale);
  }
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new Error(`Currency mismatch ${a.currency}/${b.currency}`);
  return { amount: a.amount + b.amount, currency: a.currency };
}

// ---------- ZonedDeadline ----------

/**
 * Offset (ms) of `zone` from UTC at the given instant, using Intl only
 * (no timezone library needed).
 */
function zoneOffsetMs(zone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - at.getTime();
}

/** Converts a provider-local deadline to a UTC instant. */
export function deadlineInstant(d: ZonedDeadline): Date | null {
  if (d.kind === "ROLLING") return null;
  const [date, time = "23:59"] = d.local.split("T");
  const [y, mo, da] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const naiveUtc = Date.UTC(y, mo - 1, da, h, mi);
  // Two passes handle DST edges well enough for deadlines.
  let guess = naiveUtc - zoneOffsetMs(d.zone, new Date(naiveUtc));
  guess = naiveUtc - zoneOffsetMs(d.zone, new Date(guess));
  return new Date(guess);
}

export function isOpen(d: ZonedDeadline, now = new Date()): boolean {
  const inst = deadlineInstant(d);
  return inst === null || inst.getTime() > now.getTime();
}

export function daysLeft(d: ZonedDeadline, now = new Date()): number | null {
  const inst = deadlineInstant(d);
  if (!inst) return null;
  return Math.ceil((inst.getTime() - now.getTime()) / 86_400_000);
}

/** Formats a deadline in the *student's* time zone. */
export function formatDeadline(d: ZonedDeadline, studentZone?: string, locale = "en"): string {
  const inst = deadlineInstant(d);
  if (!inst) return "Rolling deadline";
  return new Intl.DateTimeFormat(locale, {
    timeZone: studentZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(inst);
}

// ---------- Grades ----------

/** GradeScaleConverter: maps each grading system to a common 0–100 scale. */
export const GRADE_SCALE_INFO: Record<GradeScale, { label: string; max: number; step: number }> = {
  PERCENT: { label: "Percentage (%)", max: 100, step: 1 },
  GPA4: { label: "GPA (out of 4.0)", max: 4, step: 0.01 },
  CGPA10: { label: "CGPA (out of 10)", max: 10, step: 0.01 },
  IB45: { label: "IB Diploma (out of 45)", max: 45, step: 1 },
};

export function normaliseGrade(scale: GradeScale, value: number): number {
  const max = GRADE_SCALE_INFO[scale].max;
  const v = Math.max(0, Math.min(value, max));
  return Math.round((v / max) * 1000) / 10;
}
