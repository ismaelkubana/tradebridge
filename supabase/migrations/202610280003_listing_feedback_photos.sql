-- Buyer product feedback: thumbs-up reactions and optional photo attachments.
create table if not exists public.listing_feedback (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  liked boolean not null default true,
  image_url text,
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, buyer_id),
  constraint listing_feedback_comment_length check (char_length(comment) <= 500)
);
alter table public.listing_feedback enable row level security;
drop policy if exists "public reads listing feedback" on public.listing_feedback;
create policy "public reads listing feedback" on public.listing_feedback
  for select to anon, authenticated using (true);
drop policy if exists "buyers add own listing feedback" on public.listing_feedback;
create policy "buyers add own listing feedback" on public.listing_feedback
  for insert to authenticated with check (buyer_id = (select auth.uid()));
drop policy if exists "buyers update own listing feedback" on public.listing_feedback;
create policy "buyers update own listing feedback" on public.listing_feedback
  for update to authenticated using (buyer_id = (select auth.uid()))
  with check (buyer_id = (select auth.uid()));
grant select on public.listing_feedback to anon, authenticated;
grant insert, update on public.listing_feedback to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-feedback', 'listing-feedback', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "buyers upload listing feedback photos" on storage.objects;
create policy "buyers upload listing feedback photos" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'listing-feedback'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists "public reads listing feedback photos" on storage.objects;
create policy "public reads listing feedback photos" on storage.objects
for select to anon, authenticated using (bucket_id = 'listing-feedback');
