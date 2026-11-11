import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog/queries";
import { SITE_URL } from "@/lib/site";

/** Sitemap for search engines (design doc §5.8). Submit to Search Console once the domain is live. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { opportunities, universities, programs } = await getCatalog();
  const uniSlug = new Map(universities.map((u) => [u.id, u.slug]));
  return [
    { url: `${SITE_URL}/`, priority: 1 },
    { url: `${SITE_URL}/explore`, priority: 0.9 },
    { url: `${SITE_URL}/universities`, priority: 0.8 },
    ...opportunities.map((o) => ({
      url: `${SITE_URL}/${o.kind === "LOAN" ? "loans" : "scholarships"}/${o.slug}`,
      priority: 0.8,
      ...(o.lastVerifiedAt ? { lastModified: o.lastVerifiedAt } : {}),
    })),
    ...universities.map((u) => ({ url: `${SITE_URL}/universities/${u.slug}`, priority: 0.7 })),
    ...programs.map((p) => ({ url: `${SITE_URL}/universities/${uniSlug.get(p.universityId)}/${p.slug}`, priority: 0.6 })),
  ];
}
