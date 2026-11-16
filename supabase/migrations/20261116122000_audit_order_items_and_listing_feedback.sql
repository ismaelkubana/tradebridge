-- Extend the audit trail to order line items and buyer product feedback.
drop trigger if exists admin_audit_order_items on public.order_items;
create trigger admin_audit_order_items after insert or update or delete on public.order_items
for each row execute function public.capture_admin_audit_event();

drop trigger if exists admin_audit_listing_feedback on public.listing_feedback;
create trigger admin_audit_listing_feedback after insert or update or delete on public.listing_feedback
for each row execute function public.capture_admin_audit_event();

do $$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='listing_feedback') then
    alter publication supabase_realtime add table public.listing_feedback;
  end if;
end $$;
