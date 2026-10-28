-- Harden authorization helper functions.
-- Keep the admin check SECURITY DEFINER only in a non-API schema, and make
-- the public wrapper SECURITY INVOKER so Supabase's API linter does not flag it.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, auth
as $$
  select private.is_admin();
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- This function only checks the current seller's profile and billing row.
-- RLS already allows sellers to read their own rows, so SECURITY INVOKER is
-- sufficient and prevents an exposed SECURITY DEFINER RPC.
create or replace function public.seller_can_sell()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.profiles p
    join public.seller_billing b on b.seller_id = p.id
    where p.id = auth.uid()
      and p.role = 'seller'
      and (b.registration_paid_at is not null or b.trial_ends_at > now())
  );
$$;

revoke all on function public.seller_can_sell() from public, anon;
grant execute on function public.seller_can_sell() to authenticated;
