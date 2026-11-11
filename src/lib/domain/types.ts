/**
 * Core domain model (design doc §6.2, §6.5, §7.2).
 * Plain TypeScript: no Next.js or Supabase imports, so it can be reused by
 * Edge Functions and tests.
 */

export const LEVELS = ["SECONDARY", "DIPLOMA", "BACHELOR", "MASTER", "DOCTORATE", "OTHER"] as const;
export type Level = (typeof LEVELS)[number];

/** Money is never a bare number: always amount + ISO 4217 currency. */
export interface Money {
  amount: number;
  currency: string;
}

/** Deadline stored as provider-local date-time + IANA zone, or rolling. */
export type ZonedDeadline =
  | { kind: "FIXED"; local: string; zone: string } // local = "2027-01-15T23:59"
  | { kind: "ROLLING" };

export type OpportunityKind = "SCHOLARSHIP" | "LOAN";

export const SCHOLARSHIP_BASES = [
  "MERIT",
  "NEED",
  "MERIT_AND_NEED",
  "UNIVERSITY_SPECIFIC",
  "FIELD_SPECIFIC",
  "COUNTRY_SPECIFIC",
] as const;
export type ScholarshipBasis = (typeof SCHOLARSHIP_BASES)[number];

export type ProviderType =
  | "GOVERNMENT"
  | "UNIVERSITY"
  | "FOUNDATION"
  | "COMPANY"
  | "BANK"
  | "LENDER"
  | "NGO";

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  country: string; // ISO 3166-1 alpha-2
  website: string;
}

export interface LoanTerms {
  maxAmount: Money;
  rateMinPct: number;
  rateMaxPct: number;
  cosignerRequired: boolean;
  collateralRequired: boolean;
  gracePeriodMonths: number;
  internationalStudents: boolean;
}

export interface Award {
  /** Estimated cash value per year, if known. */
  amount?: Money;
  /** Plain-language coverage, e.g. "Full tuition + living stipend". */
  coverage: string;
}

/** JSON rule tree stored as data (design doc §6.2). */
export type RuleNode =
  | { type: "allOf"; children: RuleNode[] }
  | { type: "anyOf"; children: RuleNode[] }
  | { type: "inSet"; attr: string; values: string[]; optional?: boolean }
  | { type: "overlap"; attr: string; values: string[]; optional?: boolean }
  | { type: "range"; attr: string; min?: number; max?: number; optional?: boolean }
  | { type: "moneyMax"; attr: string; max: Money; optional?: boolean }
  | { type: "isTrue"; attr: string; optional?: boolean }
  | { type: "always" };

export interface Opportunity {
  id: string;
  slug: string;
  kind: OpportunityKind;
  title: string;
  provider: Provider;
  basis?: ScholarshipBasis;
  summary: string;
  description: string;
  award?: Award;
  loanTerms?: LoanTerms;
  deadline: ZonedDeadline;
  /** Pre-filter columns ("*" = any). */
  hostCountries: string[];
  nationalitiesIn: string[];
  levels: Level[];
  fields: string[];
  rules: RuleNode;
  documents: string[];
  steps: string[];
  officialUrl: string;
  lastVerifiedAt: string | null; // ISO date
  universityIds?: string[];
  programIds?: string[];
  /** True for prototype seed rows whose details have not been verified. */
  sample?: boolean;
}

export interface University {
  id: string;
  slug: string;
  name: string;
  country: string;
  city: string;
  website: string;
  financialAidUrl: string;
  blurb: string;
  /** Accent colour used for cards. */
  accent: string;
}

export interface ProgramCost {
  audience: "DOMESTIC" | "INTERNATIONAL";
  academicYear: string;
  tuition: Money;
  fees: Money;
  living: Money;
}

export interface Intake {
  term: string;
  startsOn: string; // ISO date
  deadline: ZonedDeadline;
}

export interface Program {
  id: string;
  slug: string;
  universityId: string;
  name: string;
  level: Level;
  field: string;
  durationMonths: number;
  languages: string[];
  intakes: Intake[];
  entryRequirements: string[];
  costs: ProgramCost[];
}

export const GRADE_SCALES = ["PERCENT", "GPA4", "CGPA10", "IB45"] as const;
export type GradeScale = (typeof GRADE_SCALES)[number];

export type FinancialNeed = "LOW" | "MEDIUM" | "HIGH";

/** Student profile (design doc §3.2). Optional fields may be skipped. */
export interface StudentProfile {
  version: number;
  name?: string;
  nationalities: string[];
  residenceCountry: string;
  currentLevel: Level;
  targetLevel: Level;
  targetCountries: string[];
  fields: string[];
  grade?: { scale: GradeScale; value: number };
  tests: Record<string, number>;
  householdIncome?: Money;
  financialNeed?: FinancialNeed;
  firstGeneration?: boolean;
  admittedPrograms: string[];
  currency: string;
  timeZone: string;
  updatedAt: string;
}

export type Verdict = "ELIGIBLE" | "NEEDS_INFO" | "NEAR_MISS";
