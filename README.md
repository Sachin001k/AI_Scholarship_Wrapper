# Scholarship Wrapper

A mobile-first web app that helps students find **scholarships, university programs and education loans** they actually qualify for. It works in the student's own currency and time zone, and it shows exactly why each result matches.

Built from the **System Design Document v2.0**. Feature IDs below (§3.x, P0/P1/P2) refer to that document.

> **Status:** Prototype 1 in progress (target **30 Nov 2026**). The app runs today in **demo mode** with sample data. Add Supabase keys to switch on sign-in, cloud sync and the database catalog.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # optional: works without it (demo mode)
npm run dev                    # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Eligibility-engine unit tests (Vitest) |
| `npm run typecheck` | Generate route types + TypeScript check |
| `npm run lint` | ESLint |
| `npm run seed:sql` | Regenerate `supabase/seed.sql` from `src/lib/catalog/seed-data.ts` |

### Connecting Supabase (once you have the keys)

1. In `.env.local`, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works.
2. **Create the tables (required, one time).** Without them the site still works for guests, using bundled data, but signed-in sync fails. Pick one option:
   - **Dashboard (easiest):** open Supabase → **SQL Editor** → New query.
     1. Paste all of `supabase/migrations/20261111000000_init.sql` and click **Run**.
     2. Paste `supabase/migrations/20261111000100_grants.sql` and click **Run**. New Supabase projects don't grant table access to the API roles automatically; without this every read fails with `permission denied (42501)`.
     3. Then paste `supabase/seed.sql` and click **Run**.
   - **CLI:** the CLI must be logged into the account that owns the project.
     ```bash
     supabase login
     supabase link --project-ref YOUR-PROJECT-REF
     supabase db push        # applies supabase/migrations/*
     ```
     Then run `supabase/seed.sql` in the SQL editor.
3. In the Supabase dashboard, open **Authentication → URL configuration**:
   - Site URL: your dev URL for now (later, your domain).
   - Redirect URLs: add `http://localhost:3000/auth/callback`, `http://localhost:3002/auth/callback` and `https://YOUR-DOMAIN/auth/callback`.
   - `npm run dev` picks the next free port when 3000 is busy, so check the terminal for the real URL.
4. Optional: turn on the **Google** provider under Authentication → Providers. This needs a Google Cloud OAuth client. The "Continue with Google" button appears automatically once it's enabled.
5. Restart `npm run dev`. Login shows magic-link sign-in. The catalog is read from Supabase, and the app falls back to the bundled seed data if the tables are empty or unreachable. The server logs one `[catalog] … using seed data` warning when it falls back.

**Check that it worked:** the dev terminal no longer prints `[catalog] Supabase catalog unavailable`. After signing in, rows appear in the `student_profiles` and `applications` tables when you finish onboarding and save a scholarship.

> 🔐 Security notes (from doc §2.2 / §8.3):
> - Invite each person to the Supabase org instead of sharing a password, and turn on 2FA for both GitHub and Supabase.
> - Never put the **secret / service-role key** in a `NEXT_PUBLIC_` variable, and never commit it.

---

## ✅ What's done

### Product features

| Area (doc §) | Feature | Priority | Status |
| --- | --- | --- | --- |
| 3.1 Onboarding | Email magic-link + Google sign-in (Supabase Auth, PKCE callback) | P0 | ✅ Built (needs keys to test live) |
| 3.1 | Country, language/time zone detected from the browser and confirmed by the student | P0 | ✅ |
| 3.1 | Consent capture per purpose (matching / reminders / analytics) with policy version + timestamp | P0 | ✅ Local + `consents` table |
| 3.2 Profile | 6-step animated wizard: nationality (dual), residence, current/target level, destinations, fields | P0 | ✅ |
| 3.2 | Grades in the student's own system (%, GPA/4, CGPA/10, IB/45) → common 0–100 scale; IELTS/TOEFL/SAT/ACT/GRE/GMAT | P0 | ✅ |
| 3.2 | Optional financial need, household income (any currency), first-generation | P1 | ✅ |
| 3.2 | Profile versioning (every save is a new version) | P0 | ✅ Local + `save_profile_version` RPC |
| 3.3 Catalog | Unified scholarship/loan model, scholarship basis, loan terms, providers, sample-data flag | P0 | ✅ |
| 3.3 | Source link + "last verified" on every opportunity | P0 | ✅ (sample rows show "not yet verified") |
| 3.4 Programs | University directory, program pages (level, field, duration, intakes, requirements) | P0 | ✅ 10 universities, 20 programs |
| 3.4 | Cost of attendance, linked scholarships per university/program | P1 | ✅ |
| 3.5 Funding plan | Cost − scholarships = gap; loan suggestions (lowest rate / no cosigner); any currency; monthly repayment estimate | P1/P2 | ✅ Interactive |
| 3.7 Matching | Deterministic rule engine (Composite + Registry), three-way verdict, currency-aware income rules, "why you match" | P0 | ✅ + 10 unit tests |
| 3.7 | "Add your IELTS score to check N more" prompts | P1 | ✅ |
| 3.8 Discovery | Ranked results (urgency, value, specificity, freshness), filters, sort, detail pages | P0 | ✅ |
| 3.8 | Keyword search across scholarships & loans | P1 | ✅ (client-side on /explore) |
| 3.9 Tracker | Save opportunities | P0 | ✅ Local + `applications` table sync |
| 3.9 | Status pipeline (state machine) + per-opportunity document checklist | P1 | ✅ |
| 3.13 SEO | Public pages, clean URLs, titles/descriptions, sitemap.xml, robots.txt | P0 | ✅ Statically pre-rendered |
| 3.13 | schema.org structured data (MonetaryGrant, LoanOrCredit, EducationalOccupationalProgram) | P1 | ✅ |
| 3.15 Reach | Mobile-first, installable (web manifest), 3D only on capable devices (CSS fallback on Save-Data / 2G / reduced motion / no WebGL) | P0 | ✅ |
| 3.16 Trust | Anti-scam notice; Row Level Security on every table | P0 | ✅ |

### Experience and visuals
- **Calm design with light and dark mode** for first-time students and their parents: one deep-blue brand colour, plain cards, the Geist font.
  - The theme follows the device by default; the sun/moon button in the nav switches it and remembers the choice (`src/lib/theme.ts`).
  - A tiny script in `<head>` applies the theme before first paint, so dark mode never flashes white.
- **3D globe in the home hero** (three.js via React Three Fiber, lazy-loaded):
  - Continents drawn as ~3.6k dots (precomputed into 31 KB from a NASA land mask), with journey arcs and moving dots from India to study destinations.
  - "Scholar" animation: a graduation cap that bobs and is tossed up with a flip every few seconds, and a floating diploma scroll.
  - Colours follow the theme (deep-blue dots on a pale sphere in light mode; glowing blue with stars in dark mode).
- **Less on every screen:**
  - Home has one message, one main button, three steps and three example scholarships.
  - Onboarding has 5 short steps. Country lists show a few suggestions plus search, and your current level is inferred from what you're applying for. Money questions are optional and tucked away.
  - Matches show one headline, three tabs (Eligible / Needs info / Almost), a type filter and at most one tip. Cards show only status, name, provider, amount and deadline; "Why you match" opens on tap.
- Shared styles live in `src/app/globals.css` (colour tokens plus `card`, `btn`, `chip`, `input`, `badge` classes in Tailwind's components layer).
- Accessible basics: visible focus rings, a skip link, real checkboxes and labels, and `prefers-reduced-motion` respected.

### Engineering
- **Next.js 16.4** (App Router, Cache Components, Turbopack), React 19, Tailwind v4, TypeScript strict.
- The catalog sits behind a `CatalogRepository` port:
  - `SeedCatalogRepository` holds the bundled sample data (demo mode).
  - `SupabaseCatalogRepository` reads the database.
  - A fallback wrapper uses the seed data whenever Supabase is empty or unreachable.
- Catalog reads are cached with `"use cache"` and tag `catalog` (revalidate after a publish).
- `POST /api/v1/match` validates input with zod and returns RFC 7807 errors.
- The same pure-TS engine runs on the server (matches) and in the browser (the "Your eligibility" box on public pages).
- **Supabase migration** (`supabase/migrations/20261111000000_init.sql`) covers:
  - Tables: roles, consents, versioned profiles, providers, opportunities and versions, universities, programs, intakes, costs, links, FX rates, matches, applications and events, outbox, audit log.
  - GIN indexes for the SQL pre-filter.
  - RLS policies and `security_invoker` read views.
  - A trigger that logs application status changes to events and the outbox.
- `supabase/seed.sql` is generated from the TypeScript seed.
- Verified: `tsc`, `eslint` and `vitest` (10/10) pass, and `next build` pre-renders 86 pages. A headless Chrome walkthrough (onboarding → matches → save → plan → detail, desktop + mobile) ran with no console errors and no mobile horizontal overflow.
- Migrations and seed are applied to the project's Supabase database. Public catalog reads, private-table protection and blocked anonymous writes were verified with the public key. Signed-in flows are not yet tested.

### Code map
```
src/lib/domain/          types, reference data (countries, fields, tests), Money / ZonedDeadline / grade helpers
src/lib/eligibility/     rule classes + RuleRegistry, engine, attributes, tests
src/lib/recommendation/  ranking strategy + match service
src/lib/funding/         exchange rates (port + static adapter), funding plan + loan strategies
src/lib/catalog/         seed data, repository (seed / Supabase / fallback), cached queries
src/lib/store/           local stores, Supabase session + sync, consent, matches hook
src/components/          OpportunityDetail, YourEligibility, ui/ (nav, footer, cards, country picker, theme toggle)
src/components/three/    Globe (capability check + CSS fallback), GlobeScene (globe, arcs, cap + diploma), land-points
src/app/                 pages: / onboarding matches explore scholarships/[slug] loans/[slug]
                         universities/[slug]/[program] plan saved login auth/callback api/v1/match
supabase/                migrations, seed.sql, config.toml
```

---

## 🔜 What still needs to be done

### Before Prototype 1 (30 Nov) — P0 gaps
- [x] Supabase keys added, migrations + seed applied, catalog served from Supabase.
- [ ] Test sign-in, profile sync and saved-item sync end to end (after deploying, with the real domain's `/auth/callback` added in Supabase).
- [ ] **Real data:** Tanisha's verified spreadsheet for 2–3 target countries, aiming for 100–300 opportunities and ~20 universities.
  - The current 26 opportunities are *sample data*: real programme names, but approximate amounts and deadlines.
- [ ] **CSV import** for editors (§3.6). For now, edit `seed-data.ts` and run `npm run seed:sql`.
- [ ] **Basic editor forms** for scholarships, loans and programs (§3.6, P0).
- [ ] **Domain + hosting:** deploy to Vercel, connect the domain, set `NEXT_PUBLIC_SITE_URL`, and submit the sitemap to Google Search Console and Bing.
- [ ] Replace the placeholder "Report incorrect information" email (`hello@example.com`) with a real form or a `reports` table.
- [ ] Final brand name and logo once the domain is chosen (set `NEXT_PUBLIC_SITE_NAME`).

### January release — P1
- [ ] Age check + guardian consent per country (`JurisdictionPolicy`, §3.1 / §8.1); account deletion + data download.
- [ ] Email deadline reminders (14/7/3/1 days, in the student's time zone): pg_cron + an Edge Function + an email provider with SPF/DKIM/DMARC.
- [ ] Background re-matching when an opportunity is published (Path B), plus new-match alerts.
- [ ] Persist match results to the `matches` table (the `PostgresMatchCache` from the doc).
- [ ] No-code rule builder, rule tester and maker-checker approval with an audit log (§3.6).
- [ ] Daily exchange-rate job writing `exchange_rates`. Rates are a static snapshot today (`src/lib/funding/fx.ts`).
- [ ] Server-side search and filters over Postgres full-text (the explore page filters in the browser today).
- [ ] AI assistant (grounded RAG over verified content, never decides eligibility) (§3.11).
- [ ] Admin dashboard: funnel, zero-match profiles, content health (§3.14).
- [ ] Rate limits / bot checks on sign-up and the match API (§3.16).
- [ ] Inline "answer one question" from the missing-info prompt, instead of reopening the wizard.
- [ ] Award duration on scholarships: the funding plan assumes awards renew every year, so one-year awards like Chevening are overstated on two-year programs.
- [ ] Service worker for offline saved items; PNG app icons for older Android devices.
- [ ] GitHub Actions CI (lint, typecheck, test, build) and branch protection on `main`.
- [ ] Accessibility audit (axe) and testing with real students on low-end phones.

### Later — P2
- Guardian accounts, counsellor console + chat, multilingual content and hreflang, document vault, provider self-service, compare programs, WhatsApp/SMS reminders.

---

## 💡 Ideas to make it better for first-year students

### Make it feel effortless
1. **"Answer 1 question → unlock N more" cards** right on the matches page: a one-tap chip answers it in place.
2. **Deadline calendar** with "add to Google/Apple calendar" (.ics) for every saved item.
3. **Weekly "your next 3 steps" digest:** one email a week with only what's due.
4. **Shareable match card:** an Open Graph image like "I qualify for 13 scholarships worth ₹2.8 Cr" for WhatsApp and Instagram, a natural growth loop.
5. **Parent view link:** read-only sharing so parents can see the plan and cost, without a full guardian account.

### Keep it simple and clear
6. **One-tap answers:** answer a missing question right on the matches page instead of reopening onboarding.
7. **"What to do next" box** on the matches page: the single nearest deadline and the one document to prepare.
8. **Plain-language glossary** tooltips for terms like "cosigner", "collateral" and "need-based".
9. **Hindi and other languages** once the target countries are fixed.
10. **Globe in onboarding:** draw arcs live as the student picks destinations (the globe component already supports it).

### Build trust
11. A **"Verified by our team" badge** with the verifier's name and date, plus **community tips** from past winners. Moderate these.
12. **Essay helper** (AI, P1+). It only gives guidance on the student's own draft and never writes the essay, which keeps it honest.

### Performance guardrails
- Measure Core Web Vitals on a real low-end Android over 3G once deployed.
- three.js loads only on the home page, only on capable devices, after the page is interactive. Pause the render loop when the hero scrolls out of view if it shows up in profiling.
