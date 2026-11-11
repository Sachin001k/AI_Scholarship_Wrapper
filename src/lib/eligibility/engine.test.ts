import { describe, expect, it } from "vitest";
import type { Opportunity, StudentProfile } from "../domain/types";
import { deadlineInstant, normaliseGrade } from "../domain/values";
import { OPPORTUNITIES } from "../catalog/seed-data";
import { EligibilityEngine, missingInfoPrompts } from "./engine";
import { computeMatches } from "../recommendation/service";

const AT = new Date("2026-11-11T00:00:00Z");

const base: StudentProfile = {
  version: 1,
  nationalities: ["IN"],
  residenceCountry: "IN",
  currentLevel: "BACHELOR",
  targetLevel: "MASTER",
  targetCountries: ["GB"],
  fields: ["ICT"],
  grade: { scale: "PERCENT", value: 88 },
  tests: { IELTS: 7.5 },
  admittedPrograms: [],
  currency: "INR",
  timeZone: "Asia/Kolkata",
  updatedAt: AT.toISOString(),
};

const byslug = (s: string) => OPPORTUNITIES.find((o) => o.slug === s) as Opportunity;
const engine = new EligibilityEngine();

describe("three-valued eligibility", () => {
  it("PASS when every condition is met", () => {
    expect(engine.evaluate(base, byslug("chevening-scholarship"), AT).verdict).toBe("ELIGIBLE");
  });

  it("UNKNOWN (needs info) when an attribute is unanswered, never FAIL", () => {
    const p = { ...base, tests: {} };
    expect(engine.evaluate(p, byslug("chevening-scholarship"), AT).verdict).toBe("NEEDS_INFO");
  });

  it("anyOf passes on TOEFL when IELTS is missing", () => {
    const p = { ...base, tests: { TOEFL: 100 } };
    expect(engine.evaluate(p, byslug("great-scholarships"), AT).verdict).toBe("ELIGIBLE");
  });

  it("near miss when exactly one condition fails", () => {
    const p = { ...base, grade: { scale: "PERCENT" as const, value: 80 } };
    const r = engine.evaluate(p, byslug("clarendon-fund"), AT);
    expect(r.verdict).toBe("NEAR_MISS");
    expect(r.failedLeafCount).toBe(1);
  });

  it("compares income across currencies", () => {
    const mit = byslug("mit-need-based-scholarship");
    const p: StudentProfile = { ...base, targetLevel: "BACHELOR", targetCountries: ["US"], currentLevel: "SECONDARY" };
    const low = { ...p, householdIncome: { amount: 1_000_000, currency: "INR" } };
    const high = { ...p, householdIncome: { amount: 30_000_000, currency: "INR" } };
    expect(engine.evaluate(low, mit, AT).verdict).toBe("ELIGIBLE");
    expect(engine.evaluate(high, mit, AT).verdict).toBe("NEAR_MISS");
  });
});

describe("matching", () => {
  it("pre-filters by nationality and destination", () => {
    const res = engine.match(base, OPPORTUNITIES, AT);
    const ids = res.map((r) => r.opportunityId);
    expect(ids).toContain("chevening-scholarship");
    expect(ids).not.toContain("fulbright-nehru-masters-fellowship"); // US only
    expect(ids).not.toContain("us-federal-direct-loan"); // US citizens only
  });

  it("suggests the question that unlocks the most results", () => {
    const res = engine.match({ ...base, tests: {} }, OPPORTUNITIES, AT);
    expect(missingInfoPrompts(res)[0]?.attr).toMatch(/^test\./);
  });

  it("ranks eligible before needs-info and totals value in the student's currency", () => {
    const r = computeMatches(base, OPPORTUNITIES, AT);
    const order = r.matches.map((m) => m.verdict);
    expect(order.indexOf("NEEDS_INFO") === -1 || order.lastIndexOf("ELIGIBLE") < order.indexOf("NEEDS_INFO")).toBe(true);
    expect(r.totals.eligibleValue?.currency).toBe("INR");
  });
});

describe("value objects", () => {
  it("normalises grades to 0–100", () => {
    expect(normaliseGrade("GPA4", 3.6)).toBe(90);
    expect(normaliseGrade("CGPA10", 8.5)).toBe(85);
  });

  it("converts provider-local deadlines to UTC", () => {
    const d = deadlineInstant({ kind: "FIXED", local: "2027-01-15T23:59", zone: "Asia/Kolkata" });
    expect(d?.toISOString()).toBe("2027-01-15T18:29:00.000Z");
  });
});
