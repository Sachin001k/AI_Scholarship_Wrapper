/**
 * Server-side catalog reads, cached with Next.js Cache Components.
 * Invalidate with revalidateTag("catalog") / updateTag("catalog") after a
 * publish (design doc §6.8 page:{type}:{slug} keys).
 */
import { cacheLife, cacheTag } from "next/cache";
import { createCatalogRepository, type Catalog } from "./repository";

export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");
  return createCatalogRepository().loadAll();
}

export async function getOpportunity(slug: string) {
  const c = await getCatalog();
  return c.opportunities.find((o) => o.slug === slug) ?? null;
}

export async function getUniversity(slug: string) {
  const c = await getCatalog();
  const university = c.universities.find((u) => u.slug === slug);
  if (!university) return null;
  return {
    university,
    programs: c.programs.filter((p) => p.universityId === university.id),
    opportunities: c.opportunities.filter((o) => o.universityIds?.includes(university.id)),
  };
}

export async function getProgram(universitySlug: string, programSlug: string) {
  const u = await getUniversity(universitySlug);
  const program = u?.programs.find((p) => p.slug === programSlug);
  if (!u || !program) return null;
  const c = await getCatalog();
  return {
    university: u.university,
    program,
    linked: c.opportunities.filter((o) => o.programIds?.includes(program.id) || o.universityIds?.includes(u.university.id)),
  };
}
