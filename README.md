# TradeBridge

A marketplace for **shops, restaurants and salons** in Kigali, Rwanda, with three portals:

| Portal | URL | Who | What they do |
|---|---|---|---|
| Buyer | `/`, `/browse`, `/cart`, `/orders` | Customers | Browse, order, book appointments, track order and payment status, submit payment references or use configured online checkout |
| Seller | `/seller` | Shop, restaurant and salon owners | Business profile, products/menu/services, stock, orders/bookings, customer list, billing and commission |
| Admin | `/admin` | You | Approve/suspend businesses, manage users and roles, see all orders, review seller fees and customer payments |

Built with **Next.js 14 + Tailwind CSS** (website) and **Supabase** (database, login, security rules).
The brand name is set in one place: `lib/brand.ts`.

> Payment migration: `supabase/migrations/202610280001_order_payments.sql` adds customer order payment tracking and RLS policies. It has been applied to the connected Supabase project. Automated online checkout requires Paypack environment variables and webhook registration before it is active.

## 1. Set up the database (free)

1. Create a free account at https://supabase.com and click **New project**.
2. Open **SQL Editor -> New query**, paste the whole of `supabase/schema.sql`, and click **Run**.
3. Open **Project Settings -> API** and copy the **Project URL** and the **anon public key**.
4. (Optional, easier testing) In **Authentication -> Providers -> Email**, turn **off** "Confirm email" while developing.

## 2. Run it on your computer

Install Node.js 20 or newer, then in this folder:

```bash
cp .env.example .env.local     # then paste your two Supabase values into .env.local
npm install
npm run dev
```

Open http://localhost:3000

## 3. Create your admin account

Anyone who registers can only become a **buyer** or **seller**. To make yourself admin:

1. Register normally in the app with your own email.
2. In Supabase **SQL Editor**, run (use your email):

```sql
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

3. Sign out and sign in again. You will land in `/admin`.

## 4. Try the full flow

1. Register a **seller** (e.g. a salon), create the business profile, add services.
2. Sign in as **admin** -> Businesses -> **Approve** it.
3. Register a **buyer**, open the business, add to cart / book, and place the order.
4. As the seller, open **Orders & bookings** and change the status. The buyer sees it in **My orders**.

## 5. Put it online for free

1. Create a GitHub repository and upload this folder (the `.gitignore` already keeps secrets out).
2. Go to https://vercel.com, sign in with GitHub, **Add New -> Project**, pick the repository.
3. Under **Environment Variables** add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Click **Deploy**. You get a free `*.vercel.app` link to share for testing.
5. In Supabase **Authentication -> URL Configuration**, set the Site URL to your Vercel link.

Free plans have usage limits and are for demos. Check each provider's current limits and move to a paid plan before a real public launch.

## Seller trial, registration fee, and commission

A new seller gets a 14-day free trial. After the trial expires, sellers cannot add/reactivate listings or receive new orders until an administrator verifies the RWF 5,000 registration payment. Existing accounts, listings, and order history are preserved. The seller portal includes `/seller/billing`; administrators review submitted payment references at `/admin/billing`. Supported recorded methods are MTN Rwanda MoMo and Equity Bank transfer. Payment references are manually verified in this version; this does not initiate a real payment or confirm money received automatically.

TradeBridge records a 5% commission when an order is marked completed. Because buyers pay sellers directly in the current design, this is tracked as commission owed rather than automatically deducted from the buyer payment. Seller commission settlement and automated MTN/bank integrations require a separately approved provider arrangement.

**Migration:** apply `supabase/migrations/20261028_seller_trial_registration_commission.sql` once in Supabase SQL Editor after reviewing it. It is additive; do not rerun the original `supabase/schema.sql` against an existing database.

## Customer payments and online checkout

Customers can submit MTN MoMo or bank-transfer transaction references from an order detail page. An administrator must compare the reference with the real provider/bank record before marking it paid. Sellers can see payment status only for their own shop's orders. Never ask customers for a MoMo PIN or banking password.

Hosted online checkout uses Paypack. To activate it:

1. Create/configure a Paypack application and hosted checkout in the Paypack dashboard.
2. In Vercel Project Settings -> Environment Variables, add `PAYPACK_CHECKOUT_APP_ID`, `PAYPACK_WEBHOOK_SIGN_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Keep all three server-only; never use the `NEXT_PUBLIC_` prefix.
3. Register the HTTPS webhook URL `https://YOUR-TRADEBRIDGE-DOMAIN/api/webhooks/paypack` in Paypack and enable it for the correct mode.
4. Redeploy after setting variables, then test in Paypack development mode before production. The webhook checks Paypack's HMAC signature, session reference, status and amount before updating a pending payment.

Paypack checkout reference: https://docs.paypack.rw/products/checkout. Webhook signature guidance: https://docs.paypack.rw/quickstart/webhooks. Do not mark a payment paid based only on a browser redirect.

## How it is secured

- All data access goes through Supabase **Row Level Security** (see `supabase/schema.sql`): sellers can only touch their own business, listings and orders; buyers only their own orders; admins everything.
- Sign-up can never create an admin. A user cannot change their own role or approve their own business.
- Order prices and stock are re-checked on the server at checkout. Prices sent from the browser are ignored.

## What is intentionally not built yet

- Automated MTN/bank transfer reconciliation and seller commission settlement (manual transfer references are reviewed by admins; hosted Paypack checkout is optional and must be configured)
- Automatic stock reduction when an order is placed (sellers update stock manually)
- Product photos, reviews and ratings
- SMS/email notifications and rider/delivery tracking
- Booking calendar with time-slot conflicts (salons currently get a requested date/time that the seller confirms)
- Global shipping, multi-currency, Kinyarwanda translation

## Project layout

```
app/            pages (buyer, /seller, /admin, auth, checkout, orders)
components/     shared UI (navbar, cart, badges, cards)
lib/            brand, types, Supabase clients, role guards, cart
supabase/       schema.sql (tables + security rules)
middleware.ts   keeps sessions fresh, protects private pages
```
