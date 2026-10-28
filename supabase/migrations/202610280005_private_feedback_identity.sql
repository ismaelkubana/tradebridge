-- Keep buyer UUIDs private while exposing safe product feedback fields publicly.
drop policy if exists "public reads listing feedback" on public.listing_feedback;
create policy "buyers read own listing feedback or admin"
on public.listing_feedback for select to authenticated
using (buyer_id = (select auth.uid()) or public.is_admin());
revoke select on public.listing_feedback from anon;

create or replace view public.listing_feedback_public as
select id, listing_id, liked, image_url, comment, created_at, updated_at
from public.listing_feedback;
grant select on public.listing_feedback_public to anon, authenticated;
