import Link from "next/link";
import { ArrowRight, BadgeCheck, Globe2, ListChecks, Scale, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { getCatalog } from "@/lib/catalog/queries";
import { convert } from "@/lib/funding/fx";
import { flag } from "@/lib/domain/reference";
import Globe from "@/components/three/Globe";
import { CountUp, Reveal } from "@/components/ui/motion";
import { OpportunityCard } from "@/components/ui/opportunity";
import HeroChips from "@/components/ui/HeroChips";

export default async function Home() {
  const catalog = await getCatalog();
  const scholarships = catalog.opportunities.filter((o) => o.kind === "SCHOLARSHIP");
  const totalUsd = scholarships.reduce((s, o) => s + (o.award?.amount ? convert(o.award.amount, "USD").amount : 0), 0);
  const featured = [...scholarships]
    .sort((a, b) => (b.award?.amount ? convert(b.award.amount, "USD").amount : 0) - (a.award?.amount ? convert(a.award.amount, "USD").amount : 0))
    .slice(0, 6);
  const countries = new Set(catalog.opportunities.flatMap((o) => o.hostCountries).filter((c) => c !== "*"));

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 pb-10 pt-8 sm:px-6 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[1.05fr_1fr] lg:pt-0">
          <div className="relative z-10 order-2 lg:order-1">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted">
                <Sparkles className="h-3.5 w-3.5 text-gold" /> For students heading to college — anywhere in the world
              </span>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl xl:text-7xl">
                Find the money for your <span className="text-gradient">dream university.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-5 max-w-xl text-lg text-muted">
                Answer a few quick questions. We match you with scholarships and education loans you actually qualify for — and show
                exactly why, in your currency and time zone.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/onboarding" className="btn-primary group inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-base font-semibold text-white">
                  Find my scholarships <span className="opacity-70">· 2 min</span>
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/explore" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-4 text-base font-medium text-white hover:bg-white/10">
                  Browse everything
                </Link>
              </div>
              <p className="mt-4 text-xs text-muted">Free forever · No sign-up needed to see matches · We never charge fees</p>
            </Reveal>
          </div>

          <div className="relative order-1 h-[360px] sm:h-[460px] lg:order-2 lg:h-[640px]">
            <Globe />
            <HeroChips />
          </div>
        </div>
      </section>

      {/* ---------- STATS ---------- */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="glass grid grid-cols-2 gap-6 rounded-3xl p-6 sm:p-8 md:grid-cols-4">
          {[
            { v: totalUsd, f: "usd", label: "in funding listed" },
            { v: catalog.opportunities.length, label: "scholarships & loans" },
            { v: catalog.universities.length, label: "universities" },
            { v: countries.size, label: "study destinations" },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-display text-3xl font-bold text-gradient sm:text-4xl">
                <CountUp value={s.v} currency={s.f === "usd" ? "USD" : undefined} />
              </p>
              <p className="mt-1 text-sm text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="mx-auto mt-28 max-w-7xl px-4 sm:px-6">
        <Reveal>
          <h2 className="font-display text-3xl font-bold sm:text-5xl">
            Three steps. <span className="text-gradient">Zero guesswork.</span>
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { icon: UserRound, title: "Tell us about you", body: "Where you're from, what you want to study and where. Grades in your own system — we convert them." },
            { icon: Sparkles, title: "See your matches", body: "Every scholarship and loan is checked against your profile. Eligible, needs-info or near-miss — with the reasons." },
            { icon: ListChecks, title: "Plan & apply", body: "Save favourites, track deadlines in your time zone, and see how scholarships and loans cover your full cost." },
          ].map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <div className="glass group relative h-full overflow-hidden rounded-3xl p-7">
                <span className="absolute right-6 top-4 font-display text-7xl font-black text-white/5 transition-colors group-hover:text-white/10">{i + 1}</span>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet to-cyan text-white shadow-lg shadow-violet/30">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-muted">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- FEATURED ---------- */}
      <section className="mx-auto mt-28 max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Reveal>
            <h2 className="font-display text-3xl font-bold sm:text-5xl">Big awards, open now</h2>
            <p className="mt-2 text-muted">A taste of what&apos;s inside. Your personal list is a few taps away.</p>
          </Reveal>
          <Link href="/explore" className="inline-flex items-center gap-1 text-cyan hover:underline">
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((o, i) => (
            <Reveal key={o.id} delay={i * 0.05} className="h-full">
              <OpportunityCard o={o} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- UNIVERSITIES MARQUEE ---------- */}
      <section className="mt-28 overflow-hidden py-4" aria-label="Universities">
        <div className="flex w-max animate-marquee gap-4 hover:[animation-play-state:paused]">
          {[...catalog.universities, ...catalog.universities].map((u, i) => (
            <Link
              key={`${u.id}-${i}`}
              href={`/universities/${u.slug}`}
              className="glass flex items-center gap-3 rounded-2xl px-5 py-4 hover:border-white/25"
              tabIndex={i >= catalog.universities.length ? -1 : 0}
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl text-lg font-bold text-white" style={{ background: u.accent }}>
                {u.name.replace(/^(University of |The )/, "")[0]}
              </span>
              <span>
                <span className="block whitespace-nowrap font-medium">{u.name}</span>
                <span className="text-sm text-muted">
                  {flag(u.country)} {u.city}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- TRUST ---------- */}
      <section className="mx-auto mt-28 max-w-7xl px-4 sm:px-6">
        <Reveal>
          <h2 className="font-display text-3xl font-bold sm:text-5xl">
            Built on <span className="text-gradient">trust</span>, not hype.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Scale, t: "Rules decide, not AI", b: "Eligibility comes from transparent, tested rules. You always see why." },
            { icon: BadgeCheck, t: "Official sources", b: "Every listing links to the official page with the date it was last checked." },
            { icon: Globe2, t: "Global by default", b: "Your currency, your time zone, your grading system." },
            { icon: ShieldCheck, t: "Private & safe", b: "We only ask what matching needs. No fees, ever." },
          ].map((x, i) => (
            <Reveal key={x.t} delay={i * 0.06}>
              <div className="glass h-full rounded-3xl p-6">
                <x.icon className="h-7 w-7 text-lime" />
                <h3 className="mt-4 font-semibold">{x.t}</h3>
                <p className="mt-1 text-sm text-muted">{x.b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mx-auto mt-28 max-w-5xl px-4 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet/30 via-ink to-cyan/20 p-10 text-center sm:p-16">
            <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-violet/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-cyan/30 blur-3xl" />
            <h2 className="relative font-display text-3xl font-bold sm:text-5xl">Your future is worth two minutes.</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-muted">No account needed to start. Save your matches later with one tap.</p>
            <Link href="/onboarding" className="btn-primary relative mt-8 inline-flex items-center gap-2 rounded-full px-8 py-4 font-semibold text-white">
              Start now <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
