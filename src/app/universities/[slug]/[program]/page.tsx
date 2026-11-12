import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { getCatalog, getProgram } from "@/lib/catalog/queries";
import { FIELD_LABEL, LEVEL_LABEL } from "@/lib/domain/reference";
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
  const intake = p.intakes[0];
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
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href={`/universities/${u.slug}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> {u.name}
      </Link>

      <header className="mt-6">
        <p className="text-sm text-muted">
          {LEVEL_LABEL[p.level]} · {FIELD_LABEL[p.field]} · {p.durationMonths} months
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{p.name}</h1>
        <p className="mt-1 text-muted">{u.name}</p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          {c && (
            <section>
              <h2 className="text-lg font-semibold">Cost per year</h2>
              <p className="text-sm text-muted">International students, {c.academicYear}</p>
              <dl className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface text-sm">
                {([["Tuition", c.tuition], ["Fees", c.fees], ["Living costs (estimate)", c.living]] as const).map(([k, m]) => (
                  <div key={k} className="flex justify-between p-4">
                    <dt className="text-muted">{k}</dt>
                    <dd>{formatMoney(m)}</dd>
                  </div>
                ))}
                <div className="flex justify-between p-4 font-semibold">
                  <dt>Total</dt>
                  <dd>{formatMoney({ amount: total, currency: c.tuition.currency })}</dd>
                </div>
              </dl>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold">Entry requirements</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {p.entryRequirements.map((r) => (
                <li key={r} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> {r}
                </li>
              ))}
            </ul>
            {intake && (
              <p className="mt-4 text-sm text-muted">
                Next intake: {intake.term} (starts {intake.startsOn}) · apply by{" "}
                {intake.deadline.kind === "FIXED" ? formatDeadline(intake.deadline, intake.deadline.zone) : "rolling"}
              </p>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <p className="font-semibold">How will you pay for it?</p>
            <p className="mt-1 text-sm text-muted">See which scholarships and loans could cover the cost, in your currency.</p>
            <Link href={`/plan?program=${encodeURIComponent(p.id)}`} className="btn btn-primary mt-4 w-full">
              Build a funding plan <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </div>

      {linked.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold">Scholarships for this program</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {linked.map((o) => (
              <OpportunityCard key={o.id} o={o} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
