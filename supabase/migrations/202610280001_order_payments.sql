-- TradeBridge order payment tracking (additive; keeps existing orders and billing intact)
create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  amount_rwf integer not null check (amount_rwf > 0),
  method text not null check (method in ('mtn_momo', 'bank_transfer', 'online_gateway')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'rejected', 'refunded')),
  transaction_reference text,
  provider_reference text,
  admin_note text,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists order_payments_order_id_idx on public.order_payments(order_id);
create index if not exists order_payments_buyer_id_idx on public.order_payments(buyer_id);
create index if not exists order_payments_shop_id_idx on public.order_payments(shop_id);
create index if not exists order_payments_status_idx on public.order_payments(status);

alter table public.order_payments enable row level security;
drop policy if exists "buyers read own order payments" on public.order_payments;
create policy "buyers read own order payments" on public.order_payments
  for select to authenticated using (buyer_id = (select auth.uid()) or public.is_admin()
    or exists (select 1 from public.shops s where s.id = order_payments.shop_id and s.owner_id = (select auth.uid())));
drop policy if exists "buyers submit own order payments" on public.order_payments;
create policy "buyers submit own order payments" on public.order_payments
  for insert to authenticated with check (
    buyer_id = (select auth.uid())
    and status = 'pending'
    and verified_by is null and verified_at is null
    and exists (
      select 1 from public.orders o
      where o.id = order_payments.order_id
        and o.buyer_id = (select auth.uid())
        and o.shop_id = order_payments.shop_id
        and o.total_rwf = order_payments.amount_rwf
        and o.status <> 'cancelled'
    )
  );
drop policy if exists "admins review order payments" on public.order_payments;
create policy "admins review order payments" on public.order_payments
  for update to authenticated using (public.is_admin())
  with check (public.is_admin());
grant select, insert, update on public.order_payments to authenticated;
