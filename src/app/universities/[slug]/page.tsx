import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Clock, Languages } from "lucide-react";
import { getCatalog, getUniversity } from "@/lib/catalog/queries";
import { FIELD_LABEL, LEVEL_LABEL, countryName, flag } from "@/lib/domain/reference";
import { formatCompactMoney } from "@/lib/domain/values";
import { OpportunityCard } from "@/components/ui/opportunity";
import { Reveal } from "@/components/ui/motion";

export async function generateStaticParams() {
  const { universities } = await getCatalog();
  return universities.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: PageProps<"/universities/[slug]">): Promise<Metadata> {
  const d = await getUniversity((await params).slug);
  if (!d) return {};
  return { title: d.university.name, description: `${d.university.blurb} Programs, costs and scholarships.` };
}

export default async function UniversityPage({ params }: PageProps<"/universities/[slug]">) {
  const d = await getUniversity((await params).slug);
  if (!d) notFound();
  const { university: u, programs, opportunities } = d;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/universities" className="inline-flex items-center gap-1 text-sm text-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All universities
      </Link>
      <header className="glass relative mt-4 overflow-hidden rounded-[2rem] p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full opacity-40 blur-3xl" style={{ background: u.accent }} />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl text-4xl font-bold text-white shadow-2xl" style={{ background: u.accent }}>
            {u.name.replace(/^(University of |The )/, "")[0]}
          </span>
          <div>
            <h1 className="font-display text-3xl font-bold sm:text-5xl">{u.name}</h1>
            <p className="mt-1 text-muted">
              {flag(u.country)} {u.city}, {countryName(u.country)}
            </p>
          </div>
        </div>
        <p className="relative mt-6 max-w-3xl text-lg text-white/85">{u.blurb}</p>
        <div className="relative mt-6 flex flex-wrap gap-3 text-sm">
          <a href={u.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-4 py-2 hover:bg-white/20">
            Website <ArrowUpRight className="h-4 w-4" />
          </a>
          <a href={u.financialAidUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-4 py-2 hover:bg-white/20">
            Financial aid page <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">Programs</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {programs.map((p, i) => {
            const c = p.costs.find((x) => x.audience === "INTERNATIONAL") ?? p.costs[0];
            return (
              <Reveal key={p.id} delay={i * 0.05}>
                <Link href={`/universities/${u.slug}/${p.slug}`} className="glass group block rounded-3xl p-6 hover:border-white/20">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-violet/30 px-2.5 py-1">{LEVEL_LABEL[p.level]}</span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1">{FIELD_LABEL[p.field]}</span>
                  </div>
                  <h3 className="mt-3 font-display text-lg font-semibold group-hover:text-gradient">{p.name}</h3>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted">
                    <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {p.durationMonths} months</span>
                    <span className="inline-flex items-center gap-1"><Languages className="h-4 w-4" /> {p.languages.join(", ").toUpperCase()}</span>
                    {c && <span className="font-semibold text-white">{formatCompactMoney(c.tuition)} tuition / yr</span>}
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {opportunities.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Scholarships at {u.name}</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((o) => (
              <OpportunityCard key={o.id} o={o} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
