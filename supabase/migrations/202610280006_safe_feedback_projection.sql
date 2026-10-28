-- Replace the public projection view with a safe public table synced by a private trigger.
drop view if exists public.listing_feedback_public;
create table if not exists public.listing_feedback_public (
  id uuid primary key,
  listing_id uuid not null references public.listings(id) on delete cascade,
  liked boolean not null default true,
  image_url text,
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.listing_feedback_public enable row level security;
drop policy if exists "public reads listing feedback projection" on public.listing_feedback_public;
create policy "public reads listing feedback projection"
on public.listing_feedback_public for select to anon, authenticated using (true);
revoke insert, update, delete on public.listing_feedback_public from anon, authenticated;
grant select on public.listing_feedback_public to anon, authenticated;

create or replace function private.sync_listing_feedback_public()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.listing_feedback_public where id = old.id;
    return old;
  end if;
  insert into public.listing_feedback_public (id, listing_id, liked, image_url, comment, created_at, updated_at)
  values (new.id, new.listing_id, new.liked, new.image_url, new.comment, new.created_at, new.updated_at)
  on conflict (id) do update set
    listing_id = excluded.listing_id,
    liked = excluded.liked,
    image_url = excluded.image_url,
    comment = excluded.comment,
    updated_at = excluded.updated_at;
  return new;
end;
$$;
revoke all on function private.sync_listing_feedback_public() from public, anon, authenticated;
drop trigger if exists sync_listing_feedback_public on public.listing_feedback;
create trigger sync_listing_feedback_public
after insert or update or delete on public.listing_feedback
for each row execute function private.sync_listing_feedback_public();

insert into public.listing_feedback_public (id, listing_id, liked, image_url, comment, created_at, updated_at)
select id, listing_id, liked, image_url, comment, created_at, updated_at from public.listing_feedback
on conflict (id) do update set
  listing_id = excluded.listing_id, liked = excluded.liked, image_url = excluded.image_url,
  comment = excluded.comment, updated_at = excluded.updated_at;
