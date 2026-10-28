-- Product images are uploaded by authenticated sellers and are publicly readable
-- so buyers can see listing photos. Writes are restricted to the seller's own shop folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = true, file_size_limit = 3145728,
    allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public can view listing images" on storage.objects;
create policy "Public can view listing images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'listing-images');

drop policy if exists "Sellers upload images to own shop folder" on storage.objects;
create policy "Sellers upload images to own shop folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'listing-images'
  and exists (
    select 1 from public.shops s
    where s.id::text = (storage.foldername(name))[1]
      and s.owner_id = (select auth.uid())
  )
);

drop policy if exists "Sellers update images in own shop folder" on storage.objects;
create policy "Sellers update images in own shop folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'listing-images'
  and exists (
    select 1 from public.shops s
    where s.id::text = (storage.foldername(name))[1]
      and s.owner_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'listing-images'
  and exists (
    select 1 from public.shops s
    where s.id::text = (storage.foldername(name))[1]
      and s.owner_id = (select auth.uid())
  )
);

drop policy if exists "Sellers delete images in own shop folder" on storage.objects;
create policy "Sellers delete images in own shop folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'listing-images'
  and exists (
    select 1 from public.shops s
    where s.id::text = (storage.foldername(name))[1]
      and s.owner_id = (select auth.uid())
  )
);
