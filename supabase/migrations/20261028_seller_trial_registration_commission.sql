-- TradeBridge seller trial, registration fee, and sales commission.
-- Additive migration: preserves existing marketplace tables and records.

create table if not exists public.seller_billing (
  seller_id uuid primary key references public.profiles(id) on delete cascade,
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  registration_fee_rwf integer not null default 5000 check (registration_fee_rwf = 5000),
  registration_paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- Existing sellers receive a fresh 14-day transition trial so deploying this
-- migration does not unexpectedly lock out current sellers.
insert into public.seller_billing (seller_id, trial_started_at, trial_ends_at)
select p.id, now(), now() + interval '14 days'
from public.profiles p
where p.role = 'seller'
on conflict (seller_id) do nothing;

-- New seller accounts start their 14-day trial when they register.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_role public.user_role;
begin
  new_role := case
    when new.raw_user_meta_data->>'role' = 'seller' then 'seller'::public.user_role
    else 'buyer'::public.user_role
  end;

  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    new_role
  );

  if new_role = 'seller' then
    insert into public.seller_billing (seller_id, trial_started_at, trial_ends_at)
    values (new.id, now(), now() + interval '14 days')
    on conflict (seller_id) do nothing;
  end if;

  return new;
end;
$$;

-- This security-definer helper lets RLS enforce seller eligibility without
-- allowing sellers to edit their own billing status.
create or replace function public.seller_can_sell()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
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

revoke all on function public.seller_can_sell() from public;
grant execute on function public.seller_can_sell() to authenticated;

create table if not exists public.seller_fee_payments (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  amount_rwf integer not null default 5000 check (amount_rwf = 5000),
  method text not null check (method in ('mtn_momo', 'equity_bank')),
  transaction_reference text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'rejected')),
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  admin_note text,
  constraint seller_fee_payments_reference_nonempty check (length(trim(transaction_reference)) > 0)
);

create index if not exists seller_fee_payments_seller_status_idx
  on public.seller_fee_payments (seller_id, status, submitted_at desc);

alter table public.seller_billing enable row level security;
alter table public.seller_fee_payments enable row level security;

drop policy if exists "seller reads own billing or admin" on public.seller_billing;
create policy "seller reads own billing or admin" on public.seller_billing
  for select to authenticated
  using (seller_id = auth.uid() or public.is_admin());

drop policy if exists "admin manages seller billing" on public.seller_billing;
create policy "admin manages seller billing" on public.seller_billing
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "seller reads own fee payments or admin" on public.seller_fee_payments;
create policy "seller reads own fee payments or admin" on public.seller_fee_payments
  for select to authenticated
  using (seller_id = auth.uid() or public.is_admin());

drop policy if exists "seller submits own registration fee payment" on public.seller_fee_payments;
create policy "seller submits own registration fee payment" on public.seller_fee_payments
  for insert to authenticated
  with check (
    seller_id = auth.uid()
    and status = 'pending'
    and amount_rwf = 5000
    and verified_at is null
    and verified_by is null
  );

drop policy if exists "admin manages fee payments" on public.seller_fee_payments;
create policy "admin manages fee payments" on public.seller_fee_payments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Once an administrator verifies a registration payment, unlock selling.
create or replace function public.apply_seller_registration_payment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    new.verified_at := coalesce(new.verified_at, now());
    new.verified_by := coalesce(new.verified_by, auth.uid());
    update public.seller_billing
      set registration_paid_at = coalesce(registration_paid_at, now())
      where seller_id = new.seller_id;
  end if;
  return new;
end;
$$;

drop trigger if exists apply_seller_registration_payment_trigger on public.seller_fee_payments;
create trigger apply_seller_registration_payment_trigger
before update of status on public.seller_fee_payments
for each row execute function public.apply_seller_registration_payment();

-- Replace permissive seller listing policies with trial-aware policies.
drop policy if exists "sellers insert own listings" on public.listings;
create policy "active sellers insert own listings" on public.listings
  for insert to authenticated
  with check (
    public.seller_can_sell()
    and exists (
      select 1 from public.shops s
      where s.id = shop_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "sellers update own listings" on public.listings;
create policy "sellers update own listings while eligible or hide listings" on public.listings
  for update to authenticated
  using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
    and (public.seller_can_sell() or active = false)
  );

-- Sellers may delete listings they own, including after the trial expires.
drop policy if exists "sellers delete own listings" on public.listings;
create policy "sellers delete own listings" on public.listings
  for delete to authenticated
  using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

-- Buyers cannot create new orders for a seller whose trial expired unpaid.
drop policy if exists "buyer places order at approved shop" on public.orders;
create policy "buyer places order at approved and eligible shop" on public.orders
  for insert to authenticated
  with check (
    buyer_id = auth.uid()
    and exists (
      select 1 from public.shops s
      where s.id = shop_id
        and s.status = 'approved'
        and exists (
          select 1 from public.seller_billing b
          where b.seller_id = s.owner_id
            and (b.registration_paid_at is not null or b.trial_ends_at > now())
        )
    )
  );

-- Record the 5% commission when an order is first marked completed.
create table if not exists public.seller_commissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  gross_amount_rwf integer not null check (gross_amount_rwf >= 0),
  commission_rate numeric(5,4) not null default 0.05 check (commission_rate = 0.05),
  commission_amount_rwf integer not null check (commission_amount_rwf >= 0),
  seller_net_rwf integer not null check (seller_net_rwf >= 0),
  status text not null default 'due' check (status in ('due', 'paid', 'waived')),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create index if not exists seller_commissions_seller_status_idx
  on public.seller_commissions (seller_id, status, created_at desc);

alter table public.seller_commissions enable row level security;

drop policy if exists "seller reads own commissions or admin" on public.seller_commissions;
create policy "seller reads own commissions or admin" on public.seller_commissions
  for select to authenticated
  using (seller_id = auth.uid() or public.is_admin());

drop policy if exists "admin manages commissions" on public.seller_commissions;
create policy "admin manages commissions" on public.seller_commissions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.record_completed_order_commission()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  seller_owner uuid;
  fee integer;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    select s.owner_id into seller_owner
    from public.shops s
    where s.id = new.shop_id;

    if seller_owner is not null and new.total_rwf > 0 then
      fee := floor(new.total_rwf * 0.05)::integer;
      insert into public.seller_commissions (
        order_id, seller_id, gross_amount_rwf, commission_rate,
        commission_amount_rwf, seller_net_rwf
      )
      values (
        new.id, seller_owner, new.total_rwf, 0.05,
        fee, new.total_rwf - fee
      )
      on conflict (order_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists record_completed_order_commission_trigger on public.orders;
create trigger record_completed_order_commission_trigger
after update of status on public.orders
for each row execute function public.record_completed_order_commission();

-- Payment status and seller billing data are intentionally not writable by sellers.
-- Provider credentials and any bank account details must remain in server-side secrets.
