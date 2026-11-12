import Link from "next/link";
import { ArrowRight, Check, CircleHelp } from "lucide-react";
import { getCatalog } from "@/lib/catalog/queries";
import { convert } from "@/lib/funding/fx";
import { OpportunityCard } from "@/components/ui/opportunity";
import Globe from "@/components/three/Globe";

const STEPS = [
  { title: "Answer a few quick questions", body: "Where you're from, what and where you want to study, and your grades." },
  { title: "See what you qualify for", body: "We check every scholarship and loan for you and explain each result." },
  { title: "Save and apply", body: "Keep a shortlist, track deadlines and apply on the official site." },
];

export default async function Home() {
  const catalog = await getCatalog();
  const usd = (o: (typeof catalog.opportunities)[number]) => (o.award?.amount ? convert(o.award.amount, "USD").amount : 0);
  const featured = catalog.opportunities
    .filter((o) => o.kind === "SCHOLARSHIP")
    .sort((a, b) => usd(b) - usd(a))
    .slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <p className="eyebrow text-brand">Free for students</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Find scholarships you actually qualify for.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted">
              Tell us a little about yourself. We&apos;ll show the scholarships and education loans that fit you — and why.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/onboarding" className="btn btn-primary btn-lg">
                Find my scholarships <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/explore" className="btn btn-secondary btn-lg">
                Browse all
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">Takes about 2 minutes · No sign-up needed</p>
          </div>

          {/* 3D globe with a small "scholar" animation, plus a compact preview of results */}
          <div className="relative h-[340px] sm:h-[440px] lg:h-[520px]">
            <Globe />
            <div className="card absolute bottom-0 left-0 hidden w-72 p-4 shadow-lg sm:block" aria-hidden>
              <p className="text-xs font-medium text-muted">Your matches</p>
              <ul className="mt-2 divide-y divide-line">
                {[
                  { t: "Chevening Scholarship", v: "Eligible", ok: true },
                  { t: "Clarendon Fund (Oxford)", v: "Eligible", ok: true },
                  { t: "GREAT Scholarship", v: "Add IELTS", ok: false },
                ].map((r) => (
                  <li key={r.t} className="flex items-center justify-between gap-3 py-2">
                    <p className="truncate text-sm font-medium">{r.t}</p>
                    <span className={`badge shrink-0 ${r.ok ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>
                      {r.ok ? <Check className="h-3.5 w-3.5" /> : <CircleHelp className="h-3.5 w-3.5" />} {r.v}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-8 grid gap-8 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">{i + 1}</span>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* A few examples */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">Popular scholarships</h2>
          <Link href="/explore" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            See all {catalog.opportunities.length} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((o) => (
            <OpportunityCard key={o.id} o={o} />
          ))}
        </div>
      </section>

      {/* Trust, kept short */}
      <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
        <div className="card grid gap-6 p-6 sm:grid-cols-3 sm:p-8">
          {[
            ["Clear reasons", "Every result says exactly why you match — no black box."],
            ["Official links", "Apply directly on the provider's own website."],
            ["Always free", "We never charge students or ask for bank details."],
          ].map(([t, b]) => (
            <div key={t}>
              <p className="flex items-center gap-2 font-semibold">
                <Check className="h-4 w-4 text-ok" /> {t}
              </p>
              <p className="mt-1 text-sm text-muted">{b}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
