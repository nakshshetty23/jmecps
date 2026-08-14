-- Row Level Security and auth.users -> public.users sync for Supabase Auth.
--
-- Prisma doesn't manage RLS policies or triggers on Supabase's `auth` schema,
-- so this lives outside prisma/migrations as a plain SQL file. Run it once,
-- by hand, in the Supabase SQL Editor (or `psql`) — AFTER your first
-- `prisma migrate dev` has created the `users` table.

alter table public.users enable row level security;

create policy "Users can view own profile"
  on public.users
  for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users
  for update
  using (auth.uid() = id);

-- Phase 1.1 audit finding: the policy above has no WITH CHECK, so Postgres
-- reuses its USING clause (auth.uid() = id) for the new row too — which
-- restricts WHICH ROW can be targeted but nothing about WHICH COLUMNS,
-- letting any authenticated user rewrite their OWN role/email_verified
-- straight through Supabase's PostgREST data API. Confirmed live: an
-- `authenticated`-role UPDATE setting role = 'SUPER_ADMIN' on one's own row
-- was accepted by RLS (though app_metadata.role — the actual authorization
-- source, see getUserRole in src/lib/auth/rbac.ts — was untouched, so this
-- was never a real privilege escalation, just a spoofable display column).
-- This app never exercises this path itself (only Prisma, over a direct
-- connection that bypasses PostgREST/RLS entirely — grep confirms zero
-- `.from("users")` calls anywhere in src/), but the table is still reachable
-- by anyone calling the Supabase REST API directly with the public anon key.
-- Column-level grants close this before RLS's row predicate is even
-- evaluated, and match the policy's own apparent intent: self-editable
-- display fields only, never role/email/email_verified. Zero functional
-- impact on the app itself.
revoke update on public.users from authenticated;
grant update (full_name, institutional_affiliation) on public.users to authenticated;

-- Auto-creates a public.users profile row whenever a new Supabase Auth user
-- signs up, populated from the metadata passed to auth.signUp()'s
-- `options.data` (see src/lib/actions/auth-register.ts).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- updated_at has no DB-level default — Prisma's @updatedAt is enforced by
  -- Prisma Client only, not the database — so it must be set explicitly here.
  -- role is always RESEARCHER here, never read from raw_user_meta_data
  -- (Phase 1.1 audit finding): options.data passed to auth.signUp() is
  -- entirely client-controlled, and a crafted signup payload with
  -- role: "SUPER_ADMIN" in it was confirmed live to set this column to
  -- SUPER_ADMIN before this fix. SUPER_ADMIN/ADMIN are only ever granted
  -- via updateUserRoleAction (src/lib/actions/admin-system.ts), never at
  -- signup — same "app_metadata.role is untouched either way" caveat as
  -- the grant fix above applies here too.
  insert into public.users (id, full_name, email, institutional_affiliation, role, email_verified, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'institutional_affiliation', ''),
    'RESEARCHER'::"UserRole",
    new.email_confirmed_at is not null,
    now()
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Phase 1.3.6.2: keeps public.users.email in sync whenever a Supabase Auth
-- user's email actually changes (self-service email change, see
-- src/lib/actions/auth-email-change.ts). Fires only once Supabase's own
-- confirmation flow has fully completed — auth.users.email itself isn't
-- written until then, so there's no separate "pending" state this trigger
-- needs to account for; a request that's never confirmed simply never
-- fires this trigger at all. Matches the row by id (never by email, which
-- is exactly the value that's changing) — same SECURITY DEFINER/
-- search_path convention as handle_new_user() above, so this runs
-- regardless of the RLS grant on public.users below, which deliberately
-- still excludes email — a client can never write public.users.email
-- directly; only this trigger, reacting to the authoritative auth.users
-- change, ever does.
create or replace function public.handle_user_email_updated()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.users
  set email = new.email,
      email_verified = new.email_confirmed_at is not null,
      updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_updated();

-- Phase 1.3.9: deployment-reproducibility fix for a gap found in Phase 1.3.7
-- and confirmed in Phase 1.3.8's audit. These 9 tables were already RLS-
-- enabled on the live database (confirmed live, with zero policies on any
-- of them), but that state existed only via an undocumented, untracked
-- change — nothing in this file or in prisma/migrations ever enabled it, so
-- a fresh deployment following only this repo's documented setup
-- (`prisma migrate deploy` + this file) would NOT have reproduced it, and
-- anon/authenticated's default broad grants on these tables (see Phase
-- 1.3.8's audit — a Supabase project-level default, not something this repo
-- grants explicitly) would be fully live via PostgREST.
--
-- This section only enables RLS — matching the live state exactly. It
-- deliberately adds NO policies, same as the live database: RLS-enabled
-- with zero policies is Postgres's own deny-by-default behavior for every
-- non-owner role, which is all these tables need today, since nothing in
-- this app reads/writes them via PostgREST — only via Prisma's direct
-- connection (see the users policy comment above), which connects as the
-- table owner and is therefore entirely unaffected by RLS regardless of
-- policies. If a future feature needs a specific PostgREST-reachable read
-- (e.g. an anon-readable public endpoint), add a scoped policy for that
-- table at that time rather than relying on the default deny.
alter table public.manuscripts enable row level security;
alter table public.payments enable row level security;
alter table public.editorial_reviews enable row level security;
alter table public.issues enable row level security;
alter table public.manuscript_audit_log enable row level security;
alter table public.user_role_audit_log enable row level security;
alter table public.audit_log enable row level security;
alter table public.journal_settings enable row level security;
alter table public.category_settings enable row level security;
