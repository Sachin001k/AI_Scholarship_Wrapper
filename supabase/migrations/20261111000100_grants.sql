-- Table privileges for the API roles.
-- Newer Supabase projects no longer grant table access to `anon` / `authenticated`
-- automatically, so every table must be granted explicitly. RLS policies (init
-- migration) still decide WHICH rows each role sees; grants decide WHICH tables
-- and operations are reachable at all. Safe to run more than once.

-- Public catalog: readable by everyone (SEO pages, guests).
grant select on
  providers, opportunities, opportunity_versions, opportunity_links,
  universities, programs, intakes, program_costs, exchange_rates,
  v_published_opportunities, v_programs
to anon, authenticated;

-- Content editing for signed-in staff (RLS limits this to editor/reviewer roles).
grant insert, update, delete on
  providers, opportunities, opportunity_versions, opportunity_links,
  universities, programs, intakes, program_costs
to authenticated;

-- Student-owned data (RLS limits every row to auth.uid()).
grant select, insert, update on student_profiles to authenticated;
grant select, insert on consents to authenticated;
grant select, insert, update, delete on applications to authenticated;
grant select on matches, application_events, user_roles to authenticated;
grant insert, update, delete on user_roles to authenticated;  -- RLS: admins only

-- Functions used by the app and by RLS policies.
grant execute on function has_role(uuid, app_role) to anon, authenticated;
revoke execute on function save_profile_version(jsonb) from public, anon;
grant execute on function save_profile_version(jsonb) to authenticated;

-- outbox and audit_log intentionally get NO grants: only the service role
-- (server jobs / Edge Functions) and security-definer functions touch them.
