import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ShopCard from "@/components/ShopCard";
import { BRAND } from "@/lib/brand";
import type { Shop } from "@/lib/types";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  { type: "shop", label: "Shops & products", icon: "▦", text: "Discover everyday essentials, electronics, fashion and more.", tint: "from-blue-50 to-indigo-50", accent: "text-blue-700" },
  { type: "restaurant", label: "Food & restaurants", icon: "✳", text: "Find local food spots for your next meal.", tint: "from-orange-50 to-amber-50", accent: "text-orange-700" },
  { type: "salon", label: "Beauty & wellness", icon: "✦", text: "Explore salons and local personal-care services.", tint: "from-fuchsia-50 to-pink-50", accent: "text-fuchsia-700" },
];

const BENEFITS = [
  { icon: "✓", title: "Local businesses", text: "Discover businesses serving your community." },
  { icon: "⌕", title: "Easy discovery", text: "Search and compare shops in one place." },
  { icon: "♡", title: "Support local", text: "Help independent sellers grow their reach." },
];

export default async function HomePage() {
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let shops: Shop[] = [];
  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase.from("shops").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(8);
    shops = (data as Shop[]) ?? [];
  }

  return (
    <div className="space-y-16 pb-8 sm:space-y-20">
      {!configured && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Setup needed:</strong> add your Supabase keys to <code>.env.local</code> (see README) to display live businesses.
        </div>
      )}

      <section className="hero-panel relative isolate overflow-hidden rounded-[2rem] px-6 py-12 text-white sm:px-12 sm:py-16 lg:px-16 lg:py-20">
        <div className="hero-orb hero-orb-one" aria-hidden="true" />
        <div className="hero-orb hero-orb-two" aria-hidden="true" />
        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/90">
              <span className="h-2 w-2 rounded-full bg-emerald-300" /> YOUR LOCAL MARKETPLACE
            </span>
            <h1 className="mt-6 max-w-2xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Great local finds.<br /><span className="text-emerald-300">One simple place.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
              Discover shops, restaurants and beauty services around {BRAND.city}. Find your next favourite local business with {BRAND.name}.
            </p>
            <form action="/browse" className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-2xl shadow-slate-950/20 sm:flex-row">
              <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
                <span className="text-xl text-slate-400" aria-hidden="true">⌕</span>
                <input name="q" aria-label="Search businesses" placeholder="What are you looking for?" className="w-full border-0 bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0" />
              </label>
              <button type="submit" className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700">Explore businesses <span aria-hidden="true">→</span></button>
            </form>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-white/70">
              <span>✓ Local discovery</span><span>✓ Simple ordering</span><span>✓ Seller-friendly tools</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-sm sm:p-5">
              <div className="flex items-center justify-between border-b border-white/15 pb-4">
                <div><p className="text-xs font-medium text-white/65">DISCOVER SOMETHING GOOD</p><p className="mt-1 text-lg font-bold">Your local favourites</p></div>
                <span className="rounded-xl bg-emerald-300/15 px-3 py-2 text-xl">✦</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <Link href="/browse?type=shop" className="group rounded-2xl bg-white p-4 text-slate-900 transition hover:-translate-y-1"><span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-2xl text-blue-700">▦</span><p className="mt-4 font-bold">Local shops</p><p className="mt-1 text-xs text-slate-500">Explore products</p><p className="mt-3 text-sm font-bold text-brand-700">Browse →</p></Link>
                <Link href="/browse?type=restaurant" className="group rounded-2xl bg-white p-4 text-slate-900 transition hover:-translate-y-1"><span className="grid h-12 w-12 place-items-center rounded-xl bg-orange-50 text-2xl text-orange-700">✳</span><p className="mt-4 font-bold">Restaurants</p><p className="mt-1 text-xs text-slate-500">Find your next meal</p><p className="mt-3 text-sm font-bold text-brand-700">Discover →</p></Link>
                <div className="col-span-2 flex items-center justify-between rounded-2xl border border-white/15 bg-slate-950/15 p-4"><div><p className="text-sm font-bold">Own a business?</p><p className="mt-1 text-xs text-white/70">Bring your business online.</p></div><Link href="/register" className="rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-200">Start selling ↗</Link></div>
              </div>
            </div>
            <div className="absolute -right-3 -top-4 hidden rounded-2xl bg-white px-4 py-3 text-slate-900 shadow-xl sm:block"><p className="text-xs text-slate-500">Made for local</p><p className="text-sm font-extrabold">Businesses in Rwanda 🇷🇼</p></div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {BENEFITS.map((benefit) => <div key={benefit.title} className="flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-xl font-bold text-emerald-700">{benefit.icon}</span><div><h2 className="font-bold text-slate-900">{benefit.title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{benefit.text}</p></div></div>)}
      </section>

      <section>
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="eyebrow">EXPLORE THE MARKETPLACE</p><h2 className="section-title mt-2">What are you looking for?</h2><p className="mt-2 text-sm text-slate-500">A better way to discover businesses around you.</p></div><Link href="/browse" className="text-sm font-bold text-brand-700 hover:text-brand-800">View all businesses <span aria-hidden="true">→</span></Link></div>
        <div className="grid gap-4 md:grid-cols-3">
          {CATEGORIES.map((category) => <Link key={category.type} href={`/browse?type=${category.type}`} className={`category-card group bg-gradient-to-br ${category.tint}`}><div className={`grid h-14 w-14 place-items-center rounded-2xl bg-white text-3xl shadow-sm ${category.accent}`}>{category.icon}</div><div className="mt-8 flex items-end justify-between gap-3"><div><h3 className="text-lg font-extrabold text-slate-900">{category.label}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">{category.text}</p></div><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-lg transition group-hover:translate-x-1 ${category.accent}`}>→</span></div></Link>)}
        </div>
      </section>

      <section>
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="eyebrow">FRESH FINDS</p><h2 className="section-title mt-2">New on {BRAND.name}</h2><p className="mt-2 text-sm text-slate-500">Meet local businesses joining the community.</p></div><Link href="/browse" className="text-sm font-bold text-brand-700 hover:text-brand-800">Explore marketplace →</Link></div>
        {shops.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-2xl">⌂</span><h3 className="mt-4 font-bold text-slate-900">Your next favourite business could be here</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">No approved businesses to feature just yet. Are you a seller? Set up your business and introduce yourself to new customers.</p><Link href="/register" className="btn mt-5">Become a seller</Link></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{shops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}</div>}
      </section>

      <section className="overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-10 text-white sm:px-10 sm:py-12">
        <div className="grid items-center gap-7 md:grid-cols-[1fr_auto]"><div><p className="eyebrow text-emerald-300">GROW WITH TRADEBRIDGE</p><h2 className="mt-3 max-w-2xl text-2xl font-black tracking-tight sm:text-3xl">Your business deserves to be discovered.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Create your seller account, set up your shop and start reaching customers online. New sellers get a 14-day trial.</p></div><Link href="/register" className="inline-flex items-center justify-center rounded-xl bg-emerald-300 px-6 py-3.5 text-sm font-extrabold text-slate-950 transition hover:bg-emerald-200">Start your free trial <span className="ml-2">↗</span></Link></div>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-xs text-slate-400"><span>14-day seller trial</span><span>RWF 5,000 registration after trial</span><span>Local-first marketplace</span></div>
      </section>
    </div>
  );
}
