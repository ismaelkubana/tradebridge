# TradeBridge

TradeBridge is a plain HTML, CSS, and JavaScript marketplace for connecting customers with local shops, restaurants, and salons. It uses the existing TradeBridge Supabase project for accounts and marketplace data, and is hosted at [tradebridgerw.vercel.app](https://tradebridgerw.vercel.app/).

## What is connected

- Email and password sign-up/sign-in, with buyer or seller account types.
- Public listings from approved businesses, category filtering, search, and saved listings.
- Seller business applications, listing creation, and order status updates.
- Buyer checkout through the Supabase order function, buyer order history, and payment reference recording.
- Admin business approval and suspension, plus order and marketplace summaries.
- Installable PWA shell with offline access to the cached interface.

## Payments and delivery

Checkout records MTN Mobile Money or bank transfer as a pending payment and displays payment instructions supplied by the seller. Customers can enter a transaction reference after paying. An administrator still confirms the payment; this site does not collect money through a payment gateway.

Buyers can request delivery and enter an address. Sellers update the order status as they arrange fulfilment. Courier booking, live delivery tracking, and international shipping are not connected yet.

## Supabase setup

The browser client uses the TradeBridge project's public URL and **publishable key** in `supabase-config.js`. A publishable key is designed for public clients. Never put a Supabase service-role or secret key in this repository. Row Level Security and the database functions enforce access.

The hosted Supabase project already contains the marketplace tables and migrations. The old standalone starter migration has been removed because it described a different schema and must not be applied to the existing project.

For email confirmation, add `https://tradebridgerw.vercel.app/**` under **Authentication → URL Configuration → Redirect URLs** in the Supabase dashboard. Use the same origin for local development when you run it on localhost.

To enable the admin portal, first create and confirm your own account. Then, from the Supabase SQL Editor, grant the admin role to that specific account:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'YOUR-ADMIN-EMAIL'
);
```

Do not add admin access to public sign-up. Only run the SQL for an account you control.

## Run locally

Serve the static files from localhost so the PWA features work:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. A browser needs internet access to load Supabase's JavaScript client and the hosted database.

## Install the app

- **Android:** open the hosted site in Chrome and choose **Install app** or **Add to Home screen**.
- **iPhone/iPad:** open it in Safari, tap **Share → Add to Home Screen**, enable **Open as Web App**, then tap **Add**.
- **Windows/Linux:** in Chrome or Edge, choose the install icon in the address bar or select **Install TradeBridge** in the browser menu.
- **Mac:** use Chrome/Edge's install control, or **File → Add to Dock** in a recent Safari release.

This project uses JavaScript for browser interactions; Java and JavaScript are different languages. The frontend is plain HTML, CSS, and JavaScript with no build step. Vercel publishes the root files as a static site; the old Next.js source in the repository is not part of this site's build.
