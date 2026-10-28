-- Fix order eligibility checks without exposing seller billing rows to buyers.
create or replace function public.can_accept_marketplace_orders(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.shops s
    join public.seller_billing b on b.seller_id = s.owner_id
    where s.id = p_shop_id
      and s.status = 'approved'
      and (b.registration_paid_at is not null or b.trial_ends_at > now())
  );
$$;

revoke all on function public.can_accept_marketplace_orders(uuid) from public;
revoke all on function public.can_accept_marketplace_orders(uuid) from anon;
grant execute on function public.can_accept_marketplace_orders(uuid) to authenticated;

drop policy if exists "buyer places order at approved and eligible shop" on public.orders;
create policy "buyer places order at approved and eligible shop"
on public.orders
for insert
to authenticated
with check (
  buyer_id = (select auth.uid())
  and public.can_accept_marketplace_orders(shop_id)
);
