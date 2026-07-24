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

-- Auto-creates a public.users profile row whenever a new Supabase Auth user
-- signs up, populated from the metadata passed to auth.signUp()'s
-- `options.data` (see src/app/(auth)/register/page.tsx).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, full_name, email, institutional_affiliation, role, email_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'institutional_affiliation', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'RESEARCHER')::"UserRole",
    new.email_confirmed_at is not null
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
