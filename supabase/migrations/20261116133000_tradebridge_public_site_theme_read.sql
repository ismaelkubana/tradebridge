insert into public.platform_settings (key, value, description)
values ('site_theme', '{"preset":"emerald"}'::jsonb, 'Public website brand color preset')
on conflict (key) do nothing;

drop policy if exists platform_settings_public_theme_read on public.platform_settings;
create policy platform_settings_public_theme_read
on public.platform_settings
for select
to anon, authenticated
using (key = 'site_theme');
