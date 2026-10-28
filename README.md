# TradeBridge

A marketplace for **shops, restaurants and salons** in Kigali, Rwanda, with three portals:

| Portal | URL | Who | What they do |
|---|---|---|---|
| Buyer | `/`, `/browse`, `/cart`, `/orders` | Customers | Browse, order, book appointments, track status |
| Seller | `/seller` | Shop, restaurant and salon owners | Business profile, products/menu/services, stock, orders and bookings |
| Admin | `/admin` | You | Approve/suspend businesses, manage users and roles, see all orders |

Built with **Next.js 14 + Tailwind CSS** (website) and **Supabase** (database, login, security rules).
The brand name is set in one place: `lib/brand.ts`.

> Status: the code was written but **not yet run through `npm run build`** (the build environment had no access to npm). Expect to fix small typing issues on the first run.

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

## How it is secured

- All data access goes through Supabase **Row Level Security** (see `supabase/schema.sql`): sellers can only touch their own business, listings and orders; buyers only their own orders; admins everything.
- Sign-up can never create an admin. A user cannot change their own role or approve their own business.
- Order prices and stock are re-checked on the server at checkout. Prices sent from the browser are ignored.

## What is intentionally not built yet

- Automated payment initiation and provider webhook verification for MTN MoMo / Equity Bank (registration payment references are manually reviewed for now)
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
