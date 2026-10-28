-- Restrict RPC execution for functions intended only for database triggers.
-- Trigger invocation does not require the caller to have EXECUTE on the trigger function.

revoke all on function public.apply_seller_registration_payment() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.record_completed_order_commission() from public, anon, authenticated;

-- Checkout is callable only by signed-in users; the function also validates auth.uid().
revoke all on function public.place_marketplace_order(uuid, text, text, text, text, timestamptz, jsonb) from public, anon;
grant execute on function public.place_marketplace_order(uuid, text, text, text, text, timestamptz, jsonb) to authenticated;

-- This helper is used by seller listing RLS policies, not by anonymous requests.
revoke all on function public.seller_can_sell() from public, anon;
grant execute on function public.seller_can_sell() to authenticated;
