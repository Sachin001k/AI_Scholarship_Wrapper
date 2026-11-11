"use client";
import { createLocalStore } from "./local-store";
import { getBrowserSupabase } from "../supabase/client";

/** Consent capture (design doc §3.1, P0): per purpose, with policy version + timestamp. */
export const CONSENT_POLICY_VERSION = "2026-11-v1";
export type ConsentPurpose = "MATCHING" | "REMINDERS" | "ANALYTICS";
export type ConsentRecord = { granted: boolean; version: string; at: string };

export const consentStore = createLocalStore<Partial<Record<ConsentPurpose, ConsentRecord>>>("sw.consent.v1", {});

export async function recordConsents(choices: Record<ConsentPurpose, boolean>) {
  const at = new Date().toISOString();
  const rec = Object.fromEntries(
    Object.entries(choices).map(([k, granted]) => [k, { granted, version: CONSENT_POLICY_VERSION, at }]),
  ) as Record<ConsentPurpose, ConsentRecord>;
  consentStore.set(rec);

  const sb = getBrowserSupabase();
  const { data } = (await sb?.auth.getUser()) ?? { data: { user: null } };
  if (!sb || !data.user) return;
  await sb.from("consents").insert(
    Object.entries(choices).map(([purpose, granted]) => ({
      user_id: data.user!.id,
      purpose,
      policy_version: CONSENT_POLICY_VERSION,
      granted,
      granted_by: "SELF",
    })),
  );
}
