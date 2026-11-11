import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getCatalog } from "@/lib/catalog/queries";
import { countryName, flag } from "@/lib/domain/reference";
import { Reveal, TiltCard } from "@/components/ui/motion";

export const metadata: Metadata = {
  title: "Universities & programs",
  description: "Explore universities worldwide, their programs, costs and the scholarships tied to them.",
};

export default async function UniversitiesPage() {
  const { universities, programs, opportunities } = await getCatalog();
  const byCountry = Object.entries(
    universities.reduce<Record<string, typeof universities>>((acc, u) => ((acc[u.country] ??= []).push(u), acc), {}),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-bold sm:text-5xl">
        Universities <span className="text-gradient">& programs</span>
      </h1>
      <p className="mt-2 max-w-2xl text-muted">Costs, intakes and the scholarships linked to each university — all in one place.</p>

      {byCountry.map(([country, unis]) => (
        <section key={country} className="mt-12">
          <h2 className="font-display text-2xl font-semibold">
            {flag(country)} {countryName(country)}
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {unis.map((u, i) => {
              const nProg = programs.filter((p) => p.universityId === u.id).length;
              const nAwards = opportunities.filter((o) => o.universityIds?.includes(u.id)).length;
              return (
                <Reveal key={u.id} delay={i * 0.05} className="h-full">
                  <TiltCard className="group relative h-full rounded-3xl">
                    <Link href={`/universities/${u.slug}`} className="glass relative flex h-full flex-col overflow-hidden rounded-3xl p-6 hover:border-white/20">
                      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40 blur-3xl" style={{ background: u.accent }} />
                      <div className="relative flex items-start justify-between">
                        <span className="grid h-12 w-12 place-items-center rounded-2xl text-xl font-bold text-white shadow-lg" style={{ background: u.accent }}>
                          {u.name.replace(/^(University of |The )/, "")[0]}
                        </span>
                        <ArrowUpRight className="h-5 w-5 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
                      </div>
                      <h3 className="relative mt-4 font-display text-xl font-semibold">{u.name}</h3>
                      <p className="relative text-sm text-muted">{u.city}</p>
                      <p className="relative mt-3 line-clamp-2 text-sm text-white/75">{u.blurb}</p>
                      <div className="relative mt-auto flex gap-2 pt-5 text-xs">
                        <span className="rounded-full bg-white/10 px-2.5 py-1">{nProg} programs</span>
                        {nAwards > 0 && <span className="rounded-full bg-violet/30 px-2.5 py-1">{nAwards} linked awards</span>}
                      </div>
                    </Link>
                  </TiltCard>
                </Reveal>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
