-- Add covering indexes for foreign keys used by admin views and marketplace lookups.
create index if not exists listing_feedback_buyer_id_idx on public.listing_feedback (buyer_id);
create index if not exists listing_feedback_public_listing_id_idx on public.listing_feedback_public (listing_id);
create index if not exists order_items_listing_id_idx on public.order_items (listing_id);
create index if not exists order_payments_verified_by_idx on public.order_payments (verified_by);
create index if not exists platform_settings_updated_by_idx on public.platform_settings (updated_by);
create index if not exists seller_fee_payments_verified_by_idx on public.seller_fee_payments (verified_by);
create index if not exists shops_owner_id_idx on public.shops (owner_id);
create index if not exists site_banners_created_by_idx on public.site_banners (created_by);
