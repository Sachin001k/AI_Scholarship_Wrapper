import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { Opportunity, University } from "@/lib/domain/types";
import { FIELD_LABEL, LEVEL_LABEL, countryName } from "@/lib/domain/reference";
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

  const facts: [string, React.ReactNode][] = [
    [o.kind === "LOAN" ? "Borrow up to" : "Worth (approx.)", value ? formatMoney(value) : "Varies"],
    [
      "Deadline",
      o.deadline.kind === "ROLLING" ? (
        "Apply anytime"
      ) : (
        <>
          {formatDeadline(o.deadline, o.deadline.zone)} <DeadlineChip deadline={o.deadline} />
        </>
      ),
    ],
    o.loanTerms
      ? ["Interest", `${o.loanTerms.rateMinPct}–${o.loanTerms.rateMaxPct}% a year`]
      : ["Study in", o.hostCountries.includes("*") ? "Any country" : o.hostCountries.map(countryName).join(", ")],
  ];

  const who: [string, string][] = [
    ["Nationality", o.nationalitiesIn.includes("*") ? "Any" : o.nationalitiesIn.map(countryName).join(", ")],
    ["Level", o.levels.map((l) => LEVEL_LABEL[l]).join(", ")],
    ["Subjects", o.fields.includes("*") ? "All subjects" : o.fields.map((f) => FIELD_LABEL[f]).join(", ")],
  ];
  if (o.loanTerms) {
    who.push(["Cosigner / collateral", `${o.loanTerms.cosignerRequired ? "Cosigner needed" : "No cosigner"} · ${o.loanTerms.collateralRequired ? "collateral needed" : "no collateral"}`]);
    who.push(["Repayment starts", `${o.loanTerms.gracePeriodMonths} months after your course`]);
  }

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/explore" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All scholarships & loans
      </Link>

      <header className="mt-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted">
            {o.kind === "LOAN" ? "Education loan" : (BASIS_LABEL[o.basis ?? ""] ?? "Scholarship")}
            {o.sample && <SampleBadge />}
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{o.title}</h1>
          <p className="mt-2 text-muted">{o.provider.name}</p>
        </div>
        <SaveButton o={o} className="mt-1 border border-line" />
      </header>

      <dl className="mt-8 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
        {facts.map(([k, v]) => (
          <div key={k} className="bg-surface p-4">
            <dt className="eyebrow">{k}</dt>
            <dd className="mt-1 font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold">About</h2>
            <p className="mt-2 leading-relaxed text-ink/80">{o.description}</p>
            {o.award?.coverage && <p className="mt-2 text-sm text-muted">Covers: {o.award.coverage}</p>}
          </section>

          <section>
            <h2 className="text-lg font-semibold">Who can apply</h2>
            <dl className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
              {who.map(([k, v]) => (
                <div key={k} className="grid gap-1 p-4 text-sm sm:grid-cols-[10rem_1fr]">
                  <dt className="text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="text-lg font-semibold">How to apply</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {o.steps.map((s, i) => (
                <li key={s} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-subtle text-xs font-semibold">{i + 1}</span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-sm font-medium">Documents you&apos;ll usually need</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/80">
              {o.documents.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </section>

          {linkedUnis.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold">Universities</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {linkedUnis.map((u) => (
                  <Link key={u.id} href={`/universities/${u.slug}`} className="chip">
                    {u.name}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <YourEligibility o={o} />
          <a href={o.officialUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg w-full">
            Apply on official site <ArrowUpRight className="h-4 w-4" />
          </a>
          <p className="text-xs text-muted">
            {o.lastVerifiedAt ? `Last checked ${o.lastVerifiedAt}.` : "Not yet verified by our team."} Details can change — confirm on the
            official site.{" "}
            <a href={`mailto:hello@example.com?subject=${encodeURIComponent(`Incorrect info: ${o.title}`)}`} className="text-brand hover:underline">
              Report a problem
            </a>
          </p>
        </aside>
      </div>
    </article>
  );
}
