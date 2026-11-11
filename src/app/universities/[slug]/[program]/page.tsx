import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2 } from "lucide-react";
import { getCatalog, getProgram } from "@/lib/catalog/queries";
import { FIELD_LABEL, LEVEL_LABEL, flag } from "@/lib/domain/reference";
import { formatDeadline, formatMoney } from "@/lib/domain/values";
import { OpportunityCard } from "@/components/ui/opportunity";
import { SITE_URL } from "@/lib/site";

export async function generateStaticParams() {
  const { universities, programs } = await getCatalog();
  return programs.map((p) => ({ slug: universities.find((u) => u.id === p.universityId)!.slug, program: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/universities/[slug]/[program]">): Promise<Metadata> {
  const { slug, program } = await params;
  const d = await getProgram(slug, program);
  if (!d) return {};
  return { title: `${d.program.name} — ${d.university.name}`, description: `Costs, intakes, entry requirements and scholarships for ${d.program.name} at ${d.university.name}.` };
}

export default async function ProgramPage({ params }: PageProps<"/universities/[slug]/[program]">) {
  const { slug, program } = await params;
  const d = await getProgram(slug, program);
  if (!d) notFound();
  const { university: u, program: p, linked } = d;
  const c = p.costs.find((x) => x.audience === "INTERNATIONAL") ?? p.costs[0];
  const total = c ? c.tuition.amount + c.fees.amount + c.living.amount : 0;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalProgram",
    name: p.name,
    provider: { "@type": "CollegeOrUniversity", name: u.name, url: u.website },
    timeToComplete: `P${p.durationMonths}M`,
    url: `${SITE_URL}/universities/${u.slug}/${p.slug}`,
    ...(c ? { offers: { "@type": "Offer", price: c.tuition.amount, priceCurrency: c.tuition.currency } } : {}),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href={`/universities/${u.slug}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> {u.name}
      </Link>

      <header className="glass relative mt-4 overflow-hidden rounded-[2rem] p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full opacity-40 blur-3xl" style={{ background: u.accent }} />
        <div className="relative flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-violet/30 px-2.5 py-1">{LEVEL_LABEL[p.level]}</span>
          <span className="rounded-full bg-white/10 px-2.5 py-1">{FIELD_LABEL[p.field]}</span>
          <span className="rounded-full bg-white/10 px-2.5 py-1">{p.durationMonths} months</span>
        </div>
        <h1 className="relative mt-4 font-display text-3xl font-bold sm:text-5xl">{p.name}</h1>
        <p className="relative mt-2 text-muted">
          {flag(u.country)} {u.name} · {u.city}
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {c && (
            <section className="glass rounded-3xl p-6">
              <h2 className="font-display text-xl font-semibold">Cost of attendance ({c.academicYear}, international)</h2>
              <div className="mt-5 space-y-3">
                {([["Tuition", c.tuition, "#8b5cf6"], ["Fees", c.fees, "#22d3ee"], ["Living", c.living, "#a3e635"]] as const).map(([k, m, col]) => (
                  <div key={k}>
                    <div className="flex justify-between text-sm">
                      <span>{k}</span>
                      <span className="font-semibold">{formatMoney(m)}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${total ? (m.amount / total) * 100 : 0}%`, background: col }} />
                    </div>
                  </div>
                ))}
                <p className="flex justify-between border-t border-white/10 pt-3 font-display text-lg">
                  <span>Total per year</span>
                  <span className="text-gradient font-bold">{formatMoney({ amount: total, currency: c.tuition.currency })}</span>
                </p>
              </div>
            </section>
          )}
          <section className="glass rounded-3xl p-6">
            <h2 className="font-display text-xl font-semibold">Entry requirements</h2>
            <ul className="mt-4 space-y-2">
              {p.entryRequirements.map((r) => (
                <li key={r} className="flex gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> {r}
                </li>
              ))}
            </ul>
          </section>
          <section className="glass rounded-3xl p-6">
            <h2 className="font-display text-xl font-semibold">Intakes</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {p.intakes.map((i) => (
                <li key={i.term} className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-cyan" /> {i.term} · starts {i.startsOn} · apply by{" "}
                  {i.deadline.kind === "FIXED" ? formatDeadline(i.deadline, i.deadline.zone) : "rolling"}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="glass rounded-3xl p-6">
            <h2 className="font-display text-lg font-semibold">How will you pay for it?</h2>
            <p className="mt-1 text-sm text-muted">See scholarships and loans that can cover this program — in your currency.</p>
            <Link href={`/plan?program=${encodeURIComponent(p.id)}`} className="btn-primary mt-4 flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white">
              Build a funding plan <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </div>

      {linked.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Scholarships linked to this program</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {linked.map((o) => (
              <OpportunityCard key={o.id} o={o} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
