/**
 * Turns a StudentProfile into the flat attribute map the engine reads
 * (StudentProfile.toAttributes() in design doc §7.1).
 */
import type { StudentProfile } from "../domain/types";
import { normaliseGrade } from "../domain/values";
import { FIELD_LABEL, LEVEL_LABEL, countryName } from "../domain/reference";

export type Attributes = Record<string, unknown>;

export function toAttributes(p: StudentProfile): Attributes {
  const attrs: Attributes = {
    nationalities: p.nationalities,
    residenceCountry: p.residenceCountry,
    currentLevel: p.currentLevel,
    targetLevel: p.targetLevel,
    targetCountries: p.targetCountries,
    fieldsOfStudy: p.fields,
    academicScore: p.grade ? normaliseGrade(p.grade.scale, p.grade.value) : undefined,
    householdIncome: p.householdIncome,
    financialNeed: p.financialNeed,
    firstGeneration: p.firstGeneration,
    admittedPrograms: p.admittedPrograms,
  };
  for (const [test, score] of Object.entries(p.tests)) attrs[`test.${test}`] = score;
  return attrs;
}

/** Human labels for attributes, used in explanations. */
export const ATTRIBUTE_LABEL: Record<string, string> = {
  nationalities: "Nationality",
  residenceCountry: "Country of residence",
  currentLevel: "Current education level",
  targetLevel: "Level you want to study",
  targetCountries: "Where you want to study",
  fieldsOfStudy: "Field of study",
  academicScore: "Academic score",
  householdIncome: "Household income",
  financialNeed: "Financial need",
  firstGeneration: "First-generation student",
  admittedPrograms: "Admission to an eligible program",
};

export function attributeLabel(attr: string): string {
  if (attr.startsWith("test.")) return `${attr.slice(5)} score`;
  return ATTRIBUTE_LABEL[attr] ?? attr;
}

/** Formats a rule value (country code, level, field…) for people. */
export function valueLabel(attr: string, v: string): string {
  if (["nationalities", "residenceCountry", "targetCountries"].includes(attr)) return countryName(v);
  if (attr === "currentLevel" || attr === "targetLevel") return LEVEL_LABEL[v as keyof typeof LEVEL_LABEL] ?? v;
  if (attr === "fieldsOfStudy") return FIELD_LABEL[v] ?? v;
  return v;
}
