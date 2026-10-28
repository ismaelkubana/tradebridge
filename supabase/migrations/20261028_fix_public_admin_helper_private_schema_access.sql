-- Public listing reads evaluate public.is_admin() through RLS policies.
-- That helper delegates to private.is_admin(), so PostgREST's request roles
-- need schema usage and function execution privileges for the helper call.
-- The private schema remains unexposed through the Supabase Data API.
grant usage on schema private to anon, authenticated, authenticator;
grant execute on function private.is_admin() to anon, authenticated, authenticator;
