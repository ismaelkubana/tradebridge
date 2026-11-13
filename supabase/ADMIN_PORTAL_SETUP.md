# TradeBridge admin portal database setup

The admin portal continues to use the existing `admin` value in `public.profiles.role` and the existing `public.is_admin()` authorization helper. “Super Admin” is a display label only; this migration does not add a new role or broaden public sign-up privileges.

## Additive migration

Apply `supabase/migrations/20261113_admin_audit_and_platform_settings.sql` to the intended Supabase project using the Supabase SQL Editor or your normal migration workflow. It is additive and does not replace existing marketplace tables or migrations.

It adds:

- `public.admin_audit_logs`: append-only to API clients, readable only by admins, populated by database triggers for profile, shop, listing, order, customer-payment, seller-fee, and platform-setting changes. Audit details intentionally omit names, phone numbers, addresses, payment references, and notes.
- `public.platform_settings`: JSON settings readable and writable only by authenticated admins through RLS. Initial records describe the existing TradeBridge name, RWF currency, 14-day seller trial, RWF 5,000 seller fee, and 5% commission.

The settings rows are a configuration store only. Existing checkout, seller fee, trial, and commission enforcement remains unchanged until those application paths are deliberately updated to consume settings. The current admin settings screen is a visual preview and does not persist changes to this table yet.

## Verify after applying

Using an authorized admin session, confirm `public.platform_settings` returns the five initial records and `public.admin_audit_logs` can be read. Make a test change to an existing shop or listing in a non-production environment and confirm a log row appears. Confirm an anonymous or non-admin session cannot read either table, and that API clients cannot update or delete audit rows.

Do not put a Supabase service-role key in browser code or expose it in the repository. Do not grant admin access through public sign-up; promote only an account you control using the existing secure owner-controlled process documented in `README.md`.
