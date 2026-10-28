-- TradeBridge database schema for Supabase (PostgreSQL)
-- Run this whole file once in: Supabase dashboard -> SQL Editor -> New query -> Run

-- ---------- Enums ----------
create type user_role as enum ('buyer', 'seller', 'admin');
create type shop_type as enum ('shop', 'restaurant', 'salon');
create type shop_status as enum ('pending', 'approved', 'suspended');
create type order_status as enum ('new', 'confirmed', 'preparing', 'out_for_delivery', 'ready', 'completed', 'cancelled');
create type fulfillment_type as enum ('delivery', 'pickup', 'booking');

-- ---------- Tables ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  role user_role not null default 'buyer',
  created_at timestamptz not null default now()
);

create table shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  type shop_type not null,
  description text not null default '',
  district text not null default '',
  address text not null default '',
  phone text not null default '',
  status shop_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table listings (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  title text not null,
  description text not null default '',
  price_rwf integer not null check (price_rwf >= 0),
  stock integer check (stock is null or stock >= 0),       -- products only (null = not tracked)
  duration_min integer check (duration_min is null or duration_min > 0), -- salon services only
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  status order_status not null default 'new',
  fulfillment fulfillment_type not null,
  address text not null default '',
  scheduled_at timestamptz,
  note text not null default '',
  contact_phone text not null default '',
  total_rwf integer not null default 0,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  listing_id uuid references listings(id) on delete set null,
  title text not null,
  price_rwf integer not null,
  qty integer not null check (qty > 0)
);

create index on shops (status, type);
create index on listings (shop_id);
create index on orders (buyer_id);
create index on orders (shop_id);
create index on order_items (order_id);

-- ---------- Helper: is the current user an admin? ----------
create or replace function is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- Auto-create a profile when someone signs up ----------
-- Sign-up can only ever choose 'buyer' or 'seller'. Admins are promoted manually (see README).
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    case when new.raw_user_meta_data->>'role' = 'seller' then 'seller'::user_role else 'buyer'::user_role end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Row Level Security ----------
alter table profiles enable row level security;
alter table shops enable row level security;
alter table listings enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- profiles
create policy "read own profile or admin" on profiles
  for select using (id = auth.uid() or is_admin());
create policy "sellers can read buyer names on their orders" on profiles
  for select using (
    exists (
      select 1 from orders o join shops s on s.id = o.shop_id
      where o.buyer_id = profiles.id and s.owner_id = auth.uid()
    )
  );
-- Users may edit their own name/phone but can never change their own role.
create policy "update own profile" on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from profiles p where p.id = auth.uid()));
create policy "admin manages profiles" on profiles
  for update using (is_admin());

-- shops
create policy "public sees approved shops" on shops
  for select using (status = 'approved' or owner_id = auth.uid() or is_admin());
create policy "sellers create own shop (pending only)" on shops
  for insert with check (
    owner_id = auth.uid() and status = 'pending'
    and exists (select 1 from profiles where id = auth.uid() and role = 'seller')
  );
create policy "sellers edit own shop but cannot change status" on shops
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and status = (select s.status from shops s where s.id = shops.id));
create policy "admin manages shops" on shops
  for update using (is_admin());

-- listings
create policy "public sees active listings of approved shops" on listings
  for select using (
    exists (select 1 from shops s where s.id = listings.shop_id
            and (s.owner_id = auth.uid() or is_admin() or (s.status = 'approved' and listings.active)))
  );
create policy "sellers insert own listings" on listings
  for insert with check (exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "sellers update own listings" on listings
  for update using (exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "sellers delete own listings" on listings
  for delete using (exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "admin manages listings" on listings
  for update using (is_admin());

-- orders
create policy "buyer, shop owner or admin reads order" on orders
  for select using (
    buyer_id = auth.uid() or is_admin()
    or exists (select 1 from shops s where s.id = orders.shop_id and s.owner_id = auth.uid())
  );
create policy "buyer places order at approved shop" on orders
  for insert with check (
    buyer_id = auth.uid()
    and exists (select 1 from shops s where s.id = shop_id and s.status = 'approved')
  );
create policy "shop owner updates order status" on orders
  for update using (exists (select 1 from shops s where s.id = orders.shop_id and s.owner_id = auth.uid()));
create policy "buyer cancels own new order" on orders
  for update using (buyer_id = auth.uid() and status = 'new')
  with check (buyer_id = auth.uid() and status in ('new', 'cancelled'));
create policy "admin updates orders" on orders
  for update using (is_admin());

-- order_items
create policy "read items of visible orders" on order_items
  for select using (exists (select 1 from orders o where o.id = order_items.order_id));
create policy "buyer adds items to own new order" on order_items
  for insert with check (
    exists (select 1 from orders o where o.id = order_id and o.buyer_id = auth.uid() and o.status = 'new')
  );

-- ---------- Seed data (optional demo content) ----------
-- Demo shops need a seller account first. After you register a seller in the app,
-- approve their shop from the admin portal. No fake accounts are created here.


-- ---------- Customer order payment tracking ----------
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
create policy "buyers read own order payments" on public.order_payments for select to authenticated using (buyer_id = (select auth.uid()) or public.is_admin() or exists (select 1 from public.shops s where s.id = order_payments.shop_id and s.owner_id = (select auth.uid())));
drop policy if exists "buyers submit own order payments" on public.order_payments;
create policy "buyers submit own order payments" on public.order_payments for insert to authenticated with check (buyer_id = (select auth.uid()) and status = 'pending' and verified_by is null and verified_at is null and exists (select 1 from public.orders o where o.id = order_payments.order_id and o.buyer_id = (select auth.uid()) and o.shop_id = order_payments.shop_id and o.total_rwf = order_payments.amount_rwf and o.status <> 'cancelled'));
drop policy if exists "admins review order payments" on public.order_payments;
create policy "admins review order payments" on public.order_payments for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update on public.order_payments to authenticated;
