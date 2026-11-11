"use client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "../supabase/client";
import type { StudentProfile } from "../domain/types";
import { profileStore, savedStore, type SavedItem } from "./stores";

/** Current Supabase user (null when signed out or in demo mode). */
export function useUser(): { user: User | null; loading: boolean } {
  const [state, setState] = useState<{ user: User | null; loading: boolean }>({ user: null, loading: true });
  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- demo mode has no session
      setState({ user: null, loading: false });
      return;
    }
    sb.auth.getUser().then(({ data }) => setState({ user: data.user, loading: false }));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setState({ user: s?.user ?? null, loading: false }));
    return () => sub.subscription.unsubscribe();
  }, []);
  return state;
}

/**
 * Persists a profile. Locally always; to Supabase as a *new version* when
 * signed in (design doc §3.2 "every change creates a new version").
 */
export async function saveProfile(p: StudentProfile): Promise<void> {
  const next = { ...p, version: p.version + 1, updatedAt: new Date().toISOString() };
  profileStore.set(next);
  const sb = getBrowserSupabase();
  if (!sb) return;
  const { data } = await sb.auth.getUser();
  if (!data.user) return;
  const { error } = await sb.rpc("save_profile_version", { p_profile: toRow(next) });
  if (error) console.warn("[profile] supabase save failed:", error.message);
}

/** Pulls the latest profile + saved items after sign-in. */
export async function pullFromSupabase(): Promise<void> {
  const sb = getBrowserSupabase();
  if (!sb) return;
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return;

  const { data: prof } = await sb
    .from("student_profiles")
    .select("*")
    .eq("student_id", u.user.id)
    .eq("is_current", true)
    .maybeSingle();
  const local = profileStore.get();
  if (prof && (!local || prof.version >= local.version)) profileStore.set(fromRow(prof));
  else if (local) await saveProfile(local); // first sign-in: upload the guest profile

  const { data: apps } = await sb.from("applications").select("*").eq("student_id", u.user.id);
  if (apps?.length) {
    const merged: Record<string, SavedItem> = { ...savedStore.get() };
    for (const a of apps) {
      merged[a.opportunity_slug] = {
        slug: a.opportunity_slug,
        kind: a.kind,
        title: a.title,
        status: a.status,
        savedAt: a.created_at,
        checklist: a.checklist ?? {},
      };
    }
    savedStore.set(merged);
  }
}

/** Mirrors saved items to the applications table (upserts + deletes). */
export async function pushSaved(): Promise<void> {
  const sb = getBrowserSupabase();
  if (!sb) return;
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return;
  const items = Object.values(savedStore.get());
  if (items.length) {
    await sb.from("applications").upsert(
      items.map((i) => ({
        student_id: u.user!.id,
        opportunity_slug: i.slug,
        kind: i.kind,
        title: i.title,
        status: i.status,
        checklist: i.checklist,
      })),
      { onConflict: "student_id,opportunity_slug" },
    );
  }
  const slugs = items.map((i) => i.slug);
  const del = sb.from("applications").delete().eq("student_id", u.user.id);
  await (slugs.length ? del.not("opportunity_slug", "in", `(${slugs.map((s) => `"${s}"`).join(",")})`) : del);
}

/* eslint-disable @typescript-eslint/no-explicit-any -- DB row mapping */
function toRow(p: StudentProfile) {
  return {
    version: p.version,
    display_name: p.name ?? null,
    nationalities: p.nationalities,
    residence_country: p.residenceCountry,
    current_level: p.currentLevel,
    target_level: p.targetLevel,
    target_countries: p.targetCountries,
    fields: p.fields,
    grade_original: p.grade ?? null,
    tests: p.tests,
    household_income: p.householdIncome ?? null,
    financial_need: p.financialNeed ?? null,
    first_generation: p.firstGeneration ?? null,
    admitted_programs: p.admittedPrograms,
    currency: p.currency,
    time_zone: p.timeZone,
  };
}

function fromRow(r: any): StudentProfile {
  return {
    version: r.version,
    name: r.display_name ?? undefined,
    nationalities: r.nationalities ?? [],
    residenceCountry: r.residence_country,
    currentLevel: r.current_level,
    targetLevel: r.target_level,
    targetCountries: r.target_countries ?? [],
    fields: r.fields ?? [],
    grade: r.grade_original ?? undefined,
    tests: r.tests ?? {},
    householdIncome: r.household_income ?? undefined,
    financialNeed: r.financial_need ?? undefined,
    firstGeneration: r.first_generation ?? undefined,
    admittedPrograms: r.admitted_programs ?? [],
    currency: r.currency ?? "USD",
    timeZone: r.time_zone ?? "UTC",
    updatedAt: r.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
