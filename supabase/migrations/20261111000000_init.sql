-- Scholarship Wrapper — initial schema (design doc §6.5, §6.6)
-- Apply with:  supabase db push   (or paste into the Supabase SQL editor)
-- Every table has RLS enabled. The browser uses only the publishable/anon key.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Identity & consent
-- ---------------------------------------------------------------------------
create type app_role as enum ('student', 'guardian', 'counsellor', 'editor', 'reviewer', 'admin');

create table user_roles (
  user_id    uuid not null references auth.users on delete cascade,
  role       app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function has_role(uid uuid, r app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = uid and role = r);
$$;

create table consents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  purpose        text not null check (purpose in ('MATCHING', 'REMINDERS', 'ANALYTICS')),
  policy_version text not null,
  granted        boolean not null,
  granted_by     text not null default 'SELF',  -- SELF | GUARDIAN
  granted_at     timestamptz not null default now(),
  withdrawn_at   timestamptz
);
create index consents_user_purpose on consents (user_id, purpose);

-- ---------------------------------------------------------------------------
-- Student profile (versioned: every change is a new row)
-- ---------------------------------------------------------------------------
create table student_profiles (
  student_id        uuid not null references auth.users on delete cascade,
  version           int  not null,
  is_current        boolean not null default true,
  display_name      text,
  nationalities     text[] not null default '{}',
  residence_country text,
  current_level     text,
  target_level      text,
  target_countries  text[] not null default '{}',
  fields            text[] not null default '{}',
  academic_score    numeric,             -- normalised 0–100
  grade_original    jsonb,               -- { scale, value }
  tests             jsonb not null default '{}',
  household_income  jsonb,               -- Money { amount, currency }
  financial_need    text check (financial_need in ('LOW', 'MEDIUM', 'HIGH')),
  category          text,
  gender            text,
  first_generation  boolean,
  has_disability    boolean,
  admitted_programs text[] not null default '{}',
  currency          text,
  time_zone         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (student_id, version)
);
create unique index student_profiles_one_current on student_profiles (student_id) where is_current;
create index student_profiles_nat on student_profiles using gin (nationalities) where is_current;
create index student_profiles_targets on student_profiles using gin (target_countries) where is_current;
create index student_profiles_fields on student_profiles using gin (fields) where is_current;

-- Saves a new profile version atomically for the calling user.
create or replace function save_profile_version(p_profile jsonb)
returns int language plpgsql security definer set search_path = public as $$
-- security definer: also writes the outbox (no client policies); only ever touches auth.uid() rows.
declare
  uid uuid := auth.uid();
  next_version int;
  g jsonb := p_profile -> 'grade_original';
  score numeric;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select coalesce(max(version), 0) + 1 into next_version from student_profiles where student_id = uid;
  if g is not null and g <> 'null'::jsonb then
    score := case g ->> 'scale'
      when 'PERCENT' then (g ->> 'value')::numeric
      when 'GPA4'    then (g ->> 'value')::numeric / 4 * 100
      when 'CGPA10'  then (g ->> 'value')::numeric * 10
      when 'IB45'    then (g ->> 'value')::numeric / 45 * 100
    end;
  end if;
  update student_profiles set is_current = false, updated_at = now() where student_id = uid and is_current;
  insert into student_profiles (
    student_id, version, is_current, display_name, nationalities, residence_country, current_level, target_level,
    target_countries, fields, academic_score, grade_original, tests, household_income, financial_need,
    first_generation, admitted_programs, currency, time_zone
  ) values (
    uid, next_version, true, p_profile ->> 'display_name',
    coalesce(array(select jsonb_array_elements_text(p_profile -> 'nationalities')), '{}'),
    p_profile ->> 'residence_country', p_profile ->> 'current_level', p_profile ->> 'target_level',
    coalesce(array(select jsonb_array_elements_text(p_profile -> 'target_countries')), '{}'),
    coalesce(array(select jsonb_array_elements_text(p_profile -> 'fields')), '{}'),
    score, nullif(g, 'null'::jsonb), coalesce(p_profile -> 'tests', '{}'),
    nullif(p_profile -> 'household_income', 'null'::jsonb), p_profile ->> 'financial_need',
    (p_profile ->> 'first_generation')::boolean,
    coalesce(array(select jsonb_array_elements_text(p_profile -> 'admitted_programs')), '{}'),
    p_profile ->> 'currency', p_profile ->> 'time_zone'
  );
  insert into outbox (event_type, payload) values ('ProfileUpdated', jsonb_build_object('student_id', uid, 'version', next_version));
  return next_version;
end;
$$;

-- ---------------------------------------------------------------------------
-- Catalog: providers, opportunities (scholarships + loans), versions
-- ---------------------------------------------------------------------------
create table providers (
  id      uuid primary key default gen_random_uuid(),
  code    text unique not null,
  name    text not null,
  type    text not null,
  country text not null,
  website text
);

create table opportunities (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  kind             text not null check (kind in ('SCHOLARSHIP', 'LOAN')),
  provider_id      uuid not null references providers,
  basis            text,
  status           text not null default 'DRAFT' check (status in ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'CLOSED', 'ARCHIVED')),
  current_version  int not null default 1,
  closes_local     text,           -- provider-local "YYYY-MM-DDTHH:MM"; null = rolling
  closes_zone      text,           -- IANA zone
  closes_at        timestamptz,    -- UTC instant (derived on write)
  host_countries   text[] not null default '{*}',
  nationalities_in text[] not null default '{*}',
  levels           text[] not null default '{}',
  fields           text[] not null default '{*}',
  last_verified_at date,
  is_sample        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index opp_host on opportunities using gin (host_countries);
create index opp_nat on opportunities using gin (nationalities_in);
create index opp_levels on opportunities using gin (levels);
create index opp_fields on opportunities using gin (fields);
create index opp_status_close on opportunities (status, closes_at);

create table opportunity_versions (
  opportunity_id uuid not null references opportunities on delete cascade,
  version        int not null,
  content        jsonb not null,   -- { title, summary, description, documents[], steps[], officialUrl } (per language later)
  rules          jsonb not null default '{"type":"always"}',
  award          jsonb,
  loan_terms     jsonb,
  created_by     uuid references auth.users,
  approved_by    uuid references auth.users,
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  primary key (opportunity_id, version)
);

-- ---------------------------------------------------------------------------
-- Programs & universities
-- ---------------------------------------------------------------------------
create table universities (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  name              text not null,
  country           text not null,
  city              text,
  website           text,
  financial_aid_url text,
  blurb             text,
  accent            text
);
create index universities_country on universities (country);

create table programs (
  id              uuid primary key default gen_random_uuid(),
  university_id   uuid not null references universities on delete cascade,
  slug            text not null,
  name            text not null,
  level           text not null,
  field           text not null,
  duration_months int not null,
  languages       text[] not null default '{en}',
  entry_rules     jsonb not null default '[]',
  unique (university_id, slug)
);
create index programs_level_field on programs (level, field);

create table intakes (
  id             uuid primary key default gen_random_uuid(),
  program_id     uuid not null references programs on delete cascade,
  term           text not null,
  starts_on      date,
  deadline_local text,
  deadline_zone  text
);

create table program_costs (
  id            uuid primary key default gen_random_uuid(),
  program_id    uuid not null references programs on delete cascade,
  audience      text not null check (audience in ('DOMESTIC', 'INTERNATIONAL')),
  academic_year text not null,
  tuition       jsonb not null,
  fees          jsonb not null,
  living        jsonb not null
);

create table opportunity_links (
  id             uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities on delete cascade,
  university_id  uuid references universities on delete cascade,
  program_id     uuid references programs on delete cascade
);

create table exchange_rates (
  rate_date date not null,
  base      text not null,
  quote     text not null,
  rate      numeric not null,
  primary key (rate_date, base, quote)
);

-- ---------------------------------------------------------------------------
-- Matching, tracker, events, audit
-- ---------------------------------------------------------------------------
create table matches (
  student_id      uuid not null references auth.users on delete cascade,
  opportunity_id  uuid not null references opportunities on delete cascade,
  profile_version int not null,
  opp_version     int not null,
  verdict         text not null check (verdict in ('ELIGIBLE', 'NEEDS_INFO', 'NEAR_MISS')),
  reasons         jsonb not null default '[]',
  score           numeric,
  computed_at     timestamptz not null default now(),
  primary key (student_id, opportunity_id)
);

create table applications (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references auth.users on delete cascade,
  opportunity_id   uuid references opportunities on delete set null,
  opportunity_slug text not null,
  program_id       uuid references programs on delete set null,
  kind             text not null,
  title            text not null,
  status           text not null default 'SAVED' check (status in ('SAVED', 'IN_PROGRESS', 'DOCUMENTS_READY', 'SUBMITTED', 'AWARDED', 'REJECTED', 'WITHDRAWN', 'MISSED')),
  checklist        jsonb not null default '{}',
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (student_id, opportunity_slug)
);

create table application_events (
  id             bigint generated always as identity primary key,
  application_id uuid not null references applications on delete cascade,
  from_status    text,
  to_status      text not null,
  at             timestamptz not null default now()
);

create or replace function log_application_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into application_events (application_id, from_status, to_status)
    values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status);
    insert into outbox (event_type, payload)
    values (case when tg_op = 'INSERT' then 'ApplicationSaved' else 'StatusChanged' end,
            jsonb_build_object('application_id', new.id, 'status', new.status));
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create table outbox (
  id           bigint generated always as identity primary key,
  event_type   text not null,
  payload      jsonb not null,
  created_at   timestamptz not null default now(),
  processed_at timestamptz
);

create table audit_log (
  id        bigint generated always as identity primary key,
  actor     uuid,
  action    text not null,
  entity    text not null,
  entity_id text,
  diff      jsonb,
  at        timestamptz not null default now()
);

create trigger applications_status
  before insert or update on applications
  for each row execute function log_application_status();

-- ---------------------------------------------------------------------------
-- Read views used by the app (security_invoker => RLS of the caller applies)
-- ---------------------------------------------------------------------------
create view v_published_opportunities with (security_invoker = true) as
select
  o.id, o.slug, o.kind, o.basis, o.closes_local, o.closes_zone, o.closes_at,
  o.host_countries, o.nationalities_in, o.levels, o.fields, o.last_verified_at, o.is_sample,
  v.content, v.rules, v.award, v.loan_terms,
  jsonb_build_object('id', p.code, 'name', p.name, 'type', p.type, 'country', p.country, 'website', p.website) as provider,
  coalesce((select array_agg(distinct l.university_id::text) from opportunity_links l where l.opportunity_id = o.id and l.university_id is not null), '{}') as university_ids,
  coalesce((select array_agg(distinct l.program_id::text) from opportunity_links l where l.opportunity_id = o.id and l.program_id is not null), '{}') as program_ids
from opportunities o
join opportunity_versions v on v.opportunity_id = o.id and v.version = o.current_version
join providers p on p.id = o.provider_id
where o.status = 'PUBLISHED';

create view v_programs with (security_invoker = true) as
select
  p.id, p.university_id, p.slug, p.name, p.level, p.field, p.duration_months, p.languages, p.entry_rules,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'term', i.term, 'startsOn', i.starts_on,
      'deadline', case when i.deadline_local is null then jsonb_build_object('kind', 'ROLLING')
                       else jsonb_build_object('kind', 'FIXED', 'local', i.deadline_local, 'zone', i.deadline_zone) end))
    from intakes i where i.program_id = p.id), '[]') as intakes,
  coalesce((
    select jsonb_agg(jsonb_build_object('audience', c.audience, 'academicYear', c.academic_year,
                                        'tuition', c.tuition, 'fees', c.fees, 'living', c.living))
    from program_costs c where c.program_id = p.id), '[]') as costs
from programs p;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table user_roles           enable row level security;
alter table consents             enable row level security;
alter table student_profiles     enable row level security;
alter table providers            enable row level security;
alter table opportunities        enable row level security;
alter table opportunity_versions enable row level security;
alter table universities         enable row level security;
alter table programs             enable row level security;
alter table intakes              enable row level security;
alter table program_costs        enable row level security;
alter table opportunity_links    enable row level security;
alter table exchange_rates       enable row level security;
alter table matches              enable row level security;
alter table applications         enable row level security;
alter table application_events   enable row level security;
alter table outbox               enable row level security;  -- service role only
alter table audit_log            enable row level security;  -- service role only

-- Roles
create policy "read own roles" on user_roles for select using (user_id = auth.uid());
create policy "admins manage roles" on user_roles for all using (has_role(auth.uid(), 'admin'));

-- Consents
create policy "own consents read" on consents for select using (user_id = auth.uid());
create policy "own consents insert" on consents for insert with check (user_id = auth.uid());

-- Profiles: students read and write only their own rows
create policy "own profile read" on student_profiles for select using (student_id = auth.uid());
create policy "own profile insert" on student_profiles for insert with check (student_id = auth.uid());
create policy "own profile update" on student_profiles for update using (student_id = auth.uid());

-- Public catalog (readable without signing in, for SEO pages)
create policy "public read published" on opportunities for select using (status = 'PUBLISHED');
create policy "public read current published version" on opportunity_versions for select using (
  exists (select 1 from opportunities o where o.id = opportunity_id and o.status = 'PUBLISHED' and o.current_version = version)
);
create policy "public read" on providers for select using (true);
create policy "public read" on universities for select using (true);
create policy "public read" on programs for select using (true);
create policy "public read" on intakes for select using (true);
create policy "public read" on program_costs for select using (true);
create policy "public read" on opportunity_links for select using (true);
create policy "public read" on exchange_rates for select using (true);

-- Editors / reviewers manage content (maker-checker approval comes in P1)
create policy "editors manage opportunities" on opportunities for all
  using (has_role(auth.uid(), 'editor') or has_role(auth.uid(), 'reviewer'));
create policy "editors manage drafts" on opportunity_versions for all
  using (has_role(auth.uid(), 'editor') or has_role(auth.uid(), 'reviewer'));
create policy "editors manage providers" on providers for all using (has_role(auth.uid(), 'editor'));
create policy "editors manage universities" on universities for all using (has_role(auth.uid(), 'editor'));
create policy "editors manage programs" on programs for all using (has_role(auth.uid(), 'editor'));
create policy "editors manage intakes" on intakes for all using (has_role(auth.uid(), 'editor'));
create policy "editors manage costs" on program_costs for all using (has_role(auth.uid(), 'editor'));
create policy "editors manage links" on opportunity_links for all using (has_role(auth.uid(), 'editor'));

-- Matches & tracker
create policy "own matches read" on matches for select using (student_id = auth.uid());
create policy "own applications" on applications for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "own application events" on application_events for select using (
  exists (select 1 from applications a where a.id = application_id and a.student_id = auth.uid())
);
