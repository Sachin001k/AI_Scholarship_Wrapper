import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarClock, FileText, Flag, Footprints, Landmark, ShieldCheck } from "lucide-react";
import type { Opportunity, University } from "@/lib/domain/types";
import { FIELD_LABEL, LEVEL_LABEL, countryName, flag } from "@/lib/domain/reference";
import { formatDeadline, formatMoney } from "@/lib/domain/values";
import { BASIS_LABEL, DeadlineChip, SampleBadge, SaveButton } from "@/components/ui/opportunity";
import YourEligibility from "@/components/YourEligibility";
import { SITE_URL } from "@/lib/site";

/** Shared server-rendered detail page for scholarships and loans (public, SEO). */
export default function OpportunityDetail({ o, universities }: { o: Opportunity; universities: University[] }) {
  const value = o.award?.amount ?? o.loanTerms?.maxAmount;
  const linkedUnis = universities.filter((u) => o.universityIds?.includes(u.id));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": o.kind === "LOAN" ? "LoanOrCredit" : "MonetaryGrant",
    name: o.title,
    description: o.summary,
    url: `${SITE_URL}/${o.kind === "LOAN" ? "loans" : "scholarships"}/${o.slug}`,
    funder: { "@type": "Organization", name: o.provider.name, url: o.provider.website },
    ...(value ? { amount: { "@type": "MonetaryAmount", value: value.amount, currency: value.currency } } : {}),
  };

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/explore" className="inline-flex items-center gap-1 text-sm text-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All funding
      </Link>

      <header className="glass relative mt-4 overflow-hidden rounded-[2rem] p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full blur-3xl" style={{ background: o.kind === "LOAN" ? "rgb(34 211 238 / 0.25)" : "rgb(139 92 246 / 0.3)" }} />
        <div className="relative flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-white/10 px-3 py-1">{o.kind === "LOAN" ? "Education loan" : BASIS_LABEL[o.basis ?? ""] ?? "Scholarship"}</span>
          {o.sample && <SampleBadge />}
        </div>
        <div className="relative mt-4 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <h1 className="font-display text-3xl font-bold leading-tight sm:text-5xl">{o.title}</h1>
            <p className="mt-3 text-muted">
              {flag(o.provider.country)} {o.provider.name}
            </p>
            <p className="mt-5 text-lg text-white/85">{o.description}</p>
          </div>
          <SaveButton o={o} className="h-12 w-12 shrink-0" />
        </div>
        <div className="relative mt-8 grid gap-4 sm:grid-cols-3">
          <Fact label={o.kind === "LOAN" ? "Borrow up to" : "Worth (approx.)"} value={value ? formatMoney(value) : "Varies"} sub={o.award?.coverage} />
          {o.loanTerms ? (
            <Fact
              label="Interest rate"
              value={`${o.loanTerms.rateMinPct}–${o.loanTerms.rateMaxPct}%`}
              sub={[o.loanTerms.cosignerRequired ? "Cosigner needed" : "No cosigner", o.loanTerms.collateralRequired ? "collateral needed" : "no collateral"].join(" · ")}
            />
          ) : (
            <Fact label="Study in" value={o.hostCountries.includes("*") ? "Any country" : o.hostCountries.map(countryName).join(", ")} />
          )}
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-xs uppercase tracking-wider text-muted">Deadline</p>
            <p className="mt-1 font-semibold">{o.deadline.kind === "ROLLING" ? "Rolling" : formatDeadline(o.deadline, o.deadline.zone)}</p>
            <p className="mt-1 text-xs text-muted">
              {o.deadline.kind === "FIXED" && <>Provider time ({o.deadline.zone}) · </>}
              <DeadlineChip deadline={o.deadline} />
            </p>
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Section icon={Flag} title="Who can apply">
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              <Li k="Nationality" v={o.nationalitiesIn.includes("*") ? "Any nationality" : o.nationalitiesIn.map(countryName).join(", ")} />
              <Li k="Level" v={o.levels.map((l) => LEVEL_LABEL[l]).join(", ")} />
              <Li k="Subjects" v={o.fields.includes("*") ? "All subjects" : o.fields.map((f) => FIELD_LABEL[f]).join(", ")} />
              {o.loanTerms && <Li k="Grace period" v={`${o.loanTerms.gracePeriodMonths} months after course`} />}
              {o.loanTerms && <Li k="International students" v={o.loanTerms.internationalStudents ? "Yes" : "No"} />}
            </ul>
          </Section>
          <Section icon={FileText} title="Documents you'll need">
            <ul className="space-y-2 text-sm">
              {o.documents.map((d) => (
                <li key={d} className="flex gap-2"><span className="text-cyan">•</span> {d}</li>
              ))}
            </ul>
          </Section>
          <Section icon={Footprints} title="How to apply">
            <ol className="space-y-3">
              {o.steps.map((s, i) => (
                <li key={s} className="flex gap-3 text-sm">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet to-cyan text-xs font-bold">{i + 1}</span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
          </Section>
          {linkedUnis.length > 0 && (
            <Section icon={Landmark} title="Linked universities">
              <div className="flex flex-wrap gap-2">
                {linkedUnis.map((u) => (
                  <Link key={u.id} href={`/universities/${u.slug}`} className="rounded-full bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 hover:bg-white/10">
                    {flag(u.country)} {u.name}
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <YourEligibility o={o} />
          <a
            href={o.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-semibold text-white"
          >
            Apply on the official site <ArrowUpRight className="h-5 w-5" />
          </a>
          <div className="glass space-y-2 rounded-2xl p-4 text-xs text-muted">
            <p className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              {o.lastVerifiedAt ? `Last verified ${o.lastVerifiedAt}` : "Not yet verified by our team — check the official page."}
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-ok" /> Official link opens the provider&apos;s own website.
            </p>
            <a
              href={`mailto:hello@example.com?subject=${encodeURIComponent(`Incorrect info: ${o.title}`)}`}
              className="inline-block pt-1 text-cyan hover:underline"
            >
              Report incorrect information
            </a>
          </div>
        </aside>
      </div>
    </article>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-gradient">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Flag; title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-3xl p-6">
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
        <Icon className="h-5 w-5 text-lime" /> {title}
      </h2>
      {children}
    </section>
  );
}

function Li({ k, v }: { k: string; v: string }) {
  return (
    <li className="rounded-xl bg-white/5 p-3">
      <span className="block text-xs text-muted">{k}</span>
      {v}
    </li>
  );
}
