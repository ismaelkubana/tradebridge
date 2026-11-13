-- TradeBridge admin operations support.
-- Additive migration: preserves existing users, marketplace data, and RLS behavior.
-- Adds an append-only audit trail for sensitive marketplace changes plus
-- admin-managed platform settings. No super_admin role is introduced: the
-- existing public.is_admin() check remains the authorization boundary.

begin;

create table if not exists public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_actor_created_idx
  on public.admin_audit_logs (actor_id, created_at desc);
create index if not exists admin_audit_logs_entity_idx
  on public.admin_audit_logs (entity_type, entity_id);

alter table public.admin_audit_logs enable row level security;

-- Audit entries are readable only by admins. Browser/API clients cannot insert,
-- update, or delete entries; audited records are written by the trigger below.
drop policy if exists "admins read admin audit logs" on public.admin_audit_logs;
create policy "admins read admin audit logs"
  on public.admin_audit_logs
  for select to authenticated
  using (public.is_admin());

revoke all on public.admin_audit_logs from anon, authenticated;
grant select on public.admin_audit_logs to authenticated;
revoke all on sequence public.admin_audit_logs_id_seq from anon, authenticated;

create or replace function public.capture_admin_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  old_row jsonb := '{}'::jsonb;
  new_row jsonb := '{}'::jsonb;
  current_row jsonb;
  entity_id_value text;
  details_value jsonb := '{}'::jsonb;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    old_row := to_jsonb(old);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    new_row := to_jsonb(new);
  end if;
  current_row := case when tg_op = 'DELETE' then old_row else new_row end;
  entity_id_value := coalesce(current_row ->> 'id', current_row ->> 'key');

  -- Keep the audit trail useful without copying profile PII, payment references,
  -- addresses, notes, or other sensitive row contents into the log.
  case tg_table_name
    when 'profiles' then
      details_value := jsonb_build_object('role_before', old_row ->> 'role', 'role_after', new_row ->> 'role');
    when 'shops' then
      details_value := jsonb_build_object('status_before', old_row ->> 'status', 'status_after', new_row ->> 'status');
    when 'orders' then
      details_value := jsonb_build_object('status_before', old_row ->> 'status', 'status_after', new_row ->> 'status');
    when 'order_payments' then
      details_value := jsonb_build_object('status_before', old_row ->> 'status', 'status_after', new_row ->> 'status');
    when 'seller_fee_payments' then
      details_value := jsonb_build_object('status_before', old_row ->> 'status', 'status_after', new_row ->> 'status');
    when 'listings' then
      details_value := jsonb_build_object('active_before', old_row -> 'active', 'active_after', new_row -> 'active');
    when 'platform_settings' then
      details_value := jsonb_build_object('setting_key', current_row ->> 'key');
    else
      details_value := '{}'::jsonb;
  end case;

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), lower(tg_op), tg_table_name, entity_id_value, details_value);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.capture_admin_audit_event() from public, anon, authenticated;

-- Capture operations across the admin-managed marketplace surfaces. These
-- triggers also record changes made through trusted server-side integrations.
drop trigger if exists admin_audit_profiles on public.profiles;
create trigger admin_audit_profiles after insert or update or delete on public.profiles
  for each row execute function public.capture_admin_audit_event();
drop trigger if exists admin_audit_shops on public.shops;
create trigger admin_audit_shops after insert or update or delete on public.shops
  for each row execute function public.capture_admin_audit_event();
drop trigger if exists admin_audit_listings on public.listings;
create trigger admin_audit_listings after insert or update or delete on public.listings
  for each row execute function public.capture_admin_audit_event();
drop trigger if exists admin_audit_orders on public.orders;
create trigger admin_audit_orders after insert or update or delete on public.orders
  for each row execute function public.capture_admin_audit_event();
drop trigger if exists admin_audit_order_payments on public.order_payments;
create trigger admin_audit_order_payments after insert or update or delete on public.order_payments
  for each row execute function public.capture_admin_audit_event();
drop trigger if exists admin_audit_seller_fee_payments on public.seller_fee_payments;
create trigger admin_audit_seller_fee_payments after insert or update or delete on public.seller_fee_payments
  for each row execute function public.capture_admin_audit_event();

create table if not exists public.platform_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,63}$'),
  value jsonb not null,
  description text not null default '',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;
drop policy if exists "admins manage platform settings" on public.platform_settings;
create policy "admins manage platform settings"
  on public.platform_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.platform_settings from anon, authenticated;
grant select, insert, update on public.platform_settings to authenticated;

create or replace function public.stamp_platform_setting_update()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists stamp_platform_setting_update on public.platform_settings;
create trigger stamp_platform_setting_update before insert or update on public.platform_settings
  for each row execute function public.stamp_platform_setting_update();

-- These are configuration records for future server-side consumers. Existing
-- seller-fee and commission behavior is unchanged until application logic is
-- explicitly wired to read the settings.
insert into public.platform_settings (key, value, description)
values
  ('marketplace_name', '"TradeBridge"'::jsonb, 'Public marketplace display name.'),
  ('default_currency', '"RWF"'::jsonb, 'Marketplace currency code.'),
  ('seller_trial_days', '14'::jsonb, 'Default seller trial duration in days.'),
  ('seller_registration_fee_rwf', '5000'::jsonb, 'Seller registration fee in Rwandan francs.'),
  ('marketplace_commission_rate', '0.05'::jsonb, 'Commission rate applied to completed orders.')
on conflict (key) do nothing;

-- Platform settings are audited without recording their values.
drop trigger if exists admin_audit_platform_settings on public.platform_settings;
create trigger admin_audit_platform_settings after insert or update or delete on public.platform_settings
  for each row execute function public.capture_admin_audit_event();

commit;
