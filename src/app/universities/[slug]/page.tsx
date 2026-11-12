import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ChevronRight } from "lucide-react";
import { getCatalog, getUniversity } from "@/lib/catalog/queries";
import { FIELD_LABEL, LEVEL_LABEL, countryName } from "@/lib/domain/reference";
import { formatCompactMoney } from "@/lib/domain/values";
import { OpportunityCard } from "@/components/ui/opportunity";
import UniInitial from "@/components/ui/UniInitial";

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
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/universities" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All universities
      </Link>

      <header className="mt-6 flex items-start gap-4">
        <UniInitial name={u.name} large />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{u.name}</h1>
          <p className="mt-1 text-muted">
            {u.city}, {countryName(u.country)}
          </p>
        </div>
      </header>
      <p className="mt-6 max-w-2xl leading-relaxed text-ink/80">{u.blurb}</p>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <a href={u.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
          Website <ArrowUpRight className="h-4 w-4" />
        </a>
        <a href={u.financialAidUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
          Financial aid <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Programs</h2>
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
          {programs.map((p) => {
            const c = p.costs.find((x) => x.audience === "INTERNATIONAL") ?? p.costs[0];
            return (
              <li key={p.id}>
                <Link href={`/universities/${u.slug}/${p.slug}`} className="flex items-center justify-between gap-4 p-4 hover:bg-subtle">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted">
                      {LEVEL_LABEL[p.level]} · {FIELD_LABEL[p.field]} · {p.durationMonths} months
                      {c && ` · ${formatCompactMoney(c.tuition)} tuition/yr`}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {opportunities.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Scholarships at {u.name}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {opportunities.map((o) => (
              <OpportunityCard key={o.id} o={o} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
