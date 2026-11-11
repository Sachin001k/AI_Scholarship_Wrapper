import { z } from "zod";
import { GRADE_SCALES, LEVELS } from "./types";

const money = z.object({ amount: z.number().nonnegative(), currency: z.string().length(3) });

/** Validates profiles arriving at API routes (never trust the client). */
export const profileSchema = z.object({
  version: z.number().int().nonnegative(),
  name: z.string().max(80).optional(),
  nationalities: z.array(z.string().length(2)).max(3),
  residenceCountry: z.string().length(2),
  currentLevel: z.enum(LEVELS),
  targetLevel: z.enum(LEVELS),
  targetCountries: z.array(z.string().length(2)).max(12),
  fields: z.array(z.string().max(20)).max(5),
  grade: z.object({ scale: z.enum(GRADE_SCALES), value: z.number().nonnegative() }).optional(),
  tests: z.record(z.string().max(10), z.number()).default({}),
  householdIncome: money.optional(),
  financialNeed: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  firstGeneration: z.boolean().optional(),
  admittedPrograms: z.array(z.string().max(100)).max(20).default([]),
  currency: z.string().length(3),
  timeZone: z.string().max(64),
  updatedAt: z.string(),
});
