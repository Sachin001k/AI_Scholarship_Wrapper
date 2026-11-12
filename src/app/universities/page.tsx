import type { Metadata } from "next";
import Link from "next/link";
import { getCatalog } from "@/lib/catalog/queries";
import { countryName } from "@/lib/domain/reference";
import UniInitial from "@/components/ui/UniInitial";

export const metadata: Metadata = {
  title: "Universities & programs",
  description: "Explore universities worldwide, their programs, costs and the scholarships tied to them.",
};

export default async function UniversitiesPage() {
  const { universities, programs, opportunities } = await getCatalog();
  const byCountry = Object.entries(
    universities.reduce<Record<string, typeof universities>>((acc, u) => ((acc[u.country] ??= []).push(u), acc), {}),
  ).sort(([a], [b]) => countryName(a).localeCompare(countryName(b)));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Universities</h1>
      <p className="mt-2 text-muted">Programs, costs and the scholarships linked to each university.</p>

      {byCountry.map(([country, unis]) => (
        <section key={country} className="mt-10">
          <h2 className="text-sm font-semibold text-muted">{countryName(country)}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {unis.map((u) => {
              const nProg = programs.filter((p) => p.universityId === u.id).length;
              const nAwards = opportunities.filter((o) => o.universityIds?.includes(u.id)).length;
              return (
                <Link key={u.id} href={`/universities/${u.slug}`} className="card card-link flex items-start gap-4 p-5">
                  <UniInitial name={u.name} />
                  <div>
                    <h3 className="font-semibold leading-snug">{u.name}</h3>
                    <p className="text-sm text-muted">{u.city}</p>
                    <p className="mt-2 text-xs text-muted">
                      {nProg} programs{nAwards > 0 && ` · ${nAwards} scholarship${nAwards > 1 ? "s" : ""}`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
