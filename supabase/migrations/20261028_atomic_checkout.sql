-- Make checkout atomic: order and order items commit together or not at all.
-- Uses the caller's privileges and existing row-level security policies.

create or replace function public.place_marketplace_order(
  p_shop_id uuid,
  p_fulfillment text,
  p_address text,
  p_contact_phone text,
  p_note text,
  p_scheduled_at timestamptz,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_item record;
  v_listing public.listings%rowtype;
  v_order_id uuid;
  v_total integer := 0;
  v_item_count integer;
  v_unique_item_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_fulfillment not in ('delivery', 'pickup', 'booking') then
    raise exception 'Invalid fulfillment method';
  end if;

  if coalesce(trim(p_contact_phone), '') = '' then
    raise exception 'Contact phone is required';
  end if;

  if p_fulfillment = 'delivery' and coalesce(trim(p_address), '') = '' then
    raise exception 'Delivery address is required';
  end if;

  if p_fulfillment = 'booking' and p_scheduled_at is null then
    raise exception 'Booking date and time are required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Invalid cart items';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  select count(*), count(distinct (entry.value->>'listingId'))
    into v_item_count, v_unique_item_count
  from jsonb_array_elements(p_items) as entry(value);

  if v_item_count <> v_unique_item_count then
    raise exception 'Cart contains duplicate listing items';
  end if;

  -- Validate each listing's current price, availability and stock.
  for v_item in
    select (entry.value->>'listingId')::uuid as listing_id,
           (entry.value->>'qty')::integer as qty
    from jsonb_array_elements(p_items) as entry(value)
  loop
    if v_item.listing_id is null or v_item.qty is null or v_item.qty < 1 then
      raise exception 'Invalid cart item';
    end if;

    select l.* into v_listing
    from public.listings l
    where l.id = v_item.listing_id
      and l.shop_id = p_shop_id
      and l.active = true
    ;

    if not found then
      raise exception 'A listing is unavailable';
    end if;

    if v_listing.stock is not null and v_item.qty > v_listing.stock then
      raise exception 'Insufficient stock for a listing';
    end if;

    v_total := v_total + (v_listing.price_rwf * v_item.qty);
  end loop;

  insert into public.orders (
    buyer_id, shop_id, fulfillment, address, contact_phone, note,
    scheduled_at, total_rwf
  )
  values (
    auth.uid(), p_shop_id, p_fulfillment, nullif(trim(p_address), ''),
    trim(p_contact_phone), nullif(trim(p_note), ''),
    p_scheduled_at, v_total
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, listing_id, title, price_rwf, qty)
  select v_order_id, l.id, l.title, l.price_rwf, (entry.value->>'qty')::integer
  from jsonb_array_elements(p_items) as entry(value)
  join public.listings l
    on l.id = (entry.value->>'listingId')::uuid
   and l.shop_id = p_shop_id
   and l.active = true;

  return v_order_id;
end;
$$;

revoke all on function public.place_marketplace_order(uuid, text, text, text, text, timestamptz, jsonb) from public;
grant execute on function public.place_marketplace_order(uuid, text, text, text, text, timestamptz, jsonb) to authenticated;
