/**
 * CatalogRepository port (Repository pattern, design doc §7.8).
 * - SeedCatalogRepository: in-memory prototype data (demo mode).
 * - SupabaseCatalogRepository: reads the published catalog under RLS.
 * Business code depends only on the interface (Dependency Inversion).
 */
import { createClient } from "@supabase/supabase-js";
import type { Opportunity, Program, University } from "../domain/types";
import { OPPORTUNITIES, PROGRAMS, UNIVERSITIES } from "./seed-data";
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from "../supabase/config";

export interface Catalog {
  opportunities: Opportunity[];
  universities: University[];
  programs: Program[];
  source: "seed" | "supabase";
}

export interface CatalogRepository {
  loadAll(): Promise<Catalog>;
}

export class SeedCatalogRepository implements CatalogRepository {
  async loadAll(): Promise<Catalog> {
    return { opportunities: OPPORTUNITIES, universities: UNIVERSITIES, programs: PROGRAMS, source: "seed" };
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any -- row mapping from untyped views */
export class SupabaseCatalogRepository implements CatalogRepository {
  private readonly db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  async loadAll(): Promise<Catalog> {
    const [opps, unis, progs] = await Promise.all([
      this.db.from("v_published_opportunities").select("*"),
      this.db.from("universities").select("*"),
      this.db.from("v_programs").select("*"),
    ]);
    const err = opps.error ?? unis.error ?? progs.error;
    if (err) throw new Error(`Supabase catalog: ${err.message}`);

    const universities: University[] = (unis.data ?? []).map((u: any) => ({
      id: u.id, slug: u.slug, name: u.name, country: u.country, city: u.city ?? "",
      website: u.website ?? "", financialAidUrl: u.financial_aid_url ?? "", blurb: u.blurb ?? "",
      accent: u.accent ?? "#6366f1",
    }));
    const programs: Program[] = (progs.data ?? []).map((r: any) => ({
      id: r.id, slug: r.slug, universityId: r.university_id, name: r.name, level: r.level,
      field: r.field, durationMonths: r.duration_months, languages: r.languages ?? ["en"],
      entryRequirements: r.entry_rules ?? [], intakes: r.intakes ?? [], costs: r.costs ?? [],
    }));
    const opportunities: Opportunity[] = (opps.data ?? []).map((r: any) => ({
      id: r.id, slug: r.slug, kind: r.kind, basis: r.basis ?? undefined,
      title: r.content?.title, summary: r.content?.summary ?? "", description: r.content?.description ?? "",
      documents: r.content?.documents ?? [], steps: r.content?.steps ?? [], officialUrl: r.content?.officialUrl ?? "",
      provider: r.provider, award: r.award ?? undefined, loanTerms: r.loan_terms ?? undefined,
      deadline: r.closes_local ? { kind: "FIXED", local: r.closes_local, zone: r.closes_zone } : { kind: "ROLLING" },
      hostCountries: r.host_countries, nationalitiesIn: r.nationalities_in, levels: r.levels, fields: r.fields,
      rules: r.rules ?? { type: "always" }, lastVerifiedAt: r.last_verified_at, sample: r.is_sample,
      universityIds: r.university_ids ?? [], programIds: r.program_ids ?? [],
    }));
    return { opportunities, universities, programs, source: "supabase" };
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

let warned = false;

/**
 * Uses Supabase when configured and populated; falls back to seed data so the
 * prototype always works.
 */
export class FallbackCatalogRepository implements CatalogRepository {
  constructor(private readonly primary: CatalogRepository, private readonly fallback: CatalogRepository) {}
  async loadAll(): Promise<Catalog> {
    try {
      const c = await this.primary.loadAll();
      if (c.opportunities.length > 0) return c;
    } catch (e) {
      if (!warned) {
        warned = true;
        console.warn("[catalog] Supabase catalog unavailable, using seed data:", (e as Error).message);
      }
    }
    return this.fallback.loadAll();
  }
}

export function createCatalogRepository(): CatalogRepository {
  const seed = new SeedCatalogRepository();
  return isSupabaseConfigured ? new FallbackCatalogRepository(new SupabaseCatalogRepository(), seed) : seed;
}
