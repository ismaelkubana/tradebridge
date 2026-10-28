import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ShopCard from "@/components/ShopCard";
import { BRAND } from "@/lib/brand";
import { formatRWF } from "@/lib/format";
import type { Listing, Shop } from "@/lib/types";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  { type: "shop", label: "Groceries & essentials", icon: "▦", text: "Everyday products from local stores.", tint: "from-blue-50 to-indigo-50", accent: "text-blue-700" },
  { type: "restaurant", label: "Food & restaurants", icon: "✳", text: "Discover meals and menu favourites.", tint: "from-orange-50 to-amber-50", accent: "text-orange-700" },
  { type: "salon", label: "Beauty & wellness", icon: "✦", text: "Find salons and personal-care services.", tint: "from-fuchsia-50 to-pink-50", accent: "text-fuchsia-700" },
];

export default async function HomePage() {
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let shops: Shop[] = [];
  let listings: Listing[] = [];
  if (configured) {
    const supabase = await createClient();
    const [{ data: shopData }, { data: listingData }] = await Promise.all([
      supabase.from("shops").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(8),
      supabase.from("listings").select("*").eq("active", true).order("created_at", { ascending: false }).limit(8),
    ]);
    shops = (shopData as Shop[]) ?? [];
    listings = (listingData as Listing[]) ?? [];
  }
  const shopById = new Map(shops.map((shop) => [shop.id, shop]));

  return (
    <div className="space-y-14 pb-8 sm:space-y-20">
      {!configured && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Setup needed:</strong> add your Supabase keys to <code>.env.local</code> (see README) to display live businesses.</div>}

      <section className="hero-panel relative isolate overflow-hidden rounded-[2rem] px-6 py-12 text-white sm:px-12 sm:py-16 lg:px-16 lg:py-20">
        <div className="hero-orb hero-orb-one" aria-hidden="true" /><div className="hero-orb hero-orb-two" aria-hidden="true" />
        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/90"><span className="h-2 w-2 rounded-full bg-emerald-300" /> KIGALI'S LOCAL MARKETPLACE</span>
            <h1 className="mt-6 max-w-2xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">Shop local.<br /><span className="text-emerald-300">Get what you need.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg">Discover products, food and services from businesses around {BRAND.city}. Compare options, contact sellers and support local businesses across Rwanda.</p>
            <form action="/browse" className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-2xl shadow-slate-950/20 sm:flex-row">
              <label className="flex min-w-0 flex-1 items-center gap-3 px-3"><span className="text-xl text-slate-400" aria-hidden="true">⌕</span><input name="q" aria-label="Search marketplace" placeholder="Search for rice, pilau, salons..." className="w-full border-0 bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0" /></label>
              <button type="submit" className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700">Search marketplace <span aria-hidden="true">→</span></button>
            </form>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-white/70"><span>✓ Kigali businesses</span><span>✓ Products with photos</span><span>✓ Easy ordering</span></div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-sm sm:p-5">
              <div className="flex items-center justify-between border-b border-white/15 pb-4"><div><p className="text-xs font-medium text-white/65">YOUR NEIGHBOURHOOD MARKET</p><p className="mt-1 text-lg font-bold">Find something good</p></div><span className="rounded-xl bg-emerald-300/15 px-3 py-2 text-xl">✦</span></div>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <Link href="/browse?type=shop" className="group rounded-2xl bg-white p-4 text-slate-900 transition hover:-translate-y-1"><span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-2xl text-blue-700">▦</span><p className="mt-4 font-bold">Products</p><p className="mt-1 text-xs text-slate-500">Everyday essentials</p><p className="mt-3 text-sm font-bold text-brand-700">Shop now →</p></Link>
                <Link href="/browse?type=restaurant" className="group rounded-2xl bg-white p-4 text-slate-900 transition hover:-translate-y-1"><span className="grid h-12 w-12 place-items-center rounded-xl bg-orange-50 text-2xl text-orange-700">✳</span><p className="mt-4 font-bold">Food</p><p className="mt-1 text-xs text-slate-500">Meals and snacks</p><p className="mt-3 text-sm font-bold text-brand-700">Find food →</p></Link>
                <div className="col-span-2 flex items-center justify-between rounded-2xl border border-white/15 bg-slate-950/15 p-4"><div><p className="text-sm font-bold">Own a business?</p><p className="mt-1 text-xs text-white/70">Upload product photos and reach new customers.</p></div><Link href="/register" className="rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-200">Start selling ↗</Link></div>
              </div>
            </div>
            <div className="absolute -right-3 -top-4 hidden rounded-2xl bg-white px-4 py-3 text-slate-900 shadow-xl sm:block"><p className="text-xs text-slate-500">Made for local</p><p className="text-sm font-extrabold">Businesses in Rwanda 🇷🇼</p></div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3 sm:p-5">
        {[{icon:"⌕",title:"Discover nearby",text:"Search shops, restaurants and salons."},{icon:"▣",title:"See the real item",text:"Sellers can add product photos and details."},{icon:"♡",title:"Support local sellers",text:"Find and buy from businesses in your community."}].map((item)=><div key={item.title} className="flex items-center gap-3 p-2"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-xl font-bold text-emerald-700">{item.icon}</span><div><h2 className="font-bold text-slate-900">{item.title}</h2><p className="mt-1 text-sm text-slate-500">{item.text}</p></div></div>)}
      </section>

      <section>
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="eyebrow">BROWSE BY INTEREST</p><h2 className="section-title mt-2">What are you looking for?</h2><p className="mt-2 text-sm text-slate-500">Choose a category to discover local businesses.</p></div><Link href="/browse" className="text-sm font-bold text-brand-700 hover:text-brand-800">View all businesses →</Link></div>
        <div className="grid gap-4 md:grid-cols-3">{CATEGORIES.map((category)=><Link key={category.type} href={`/browse?type=${category.type}`} className={`category-card group bg-gradient-to-br ${category.tint}`}><div className={`grid h-14 w-14 place-items-center rounded-2xl bg-white text-3xl shadow-sm ${category.accent}`}>{category.icon}</div><div className="mt-8 flex items-end justify-between gap-3"><div><h3 className="text-lg font-extrabold text-slate-900">{category.label}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">{category.text}</p></div><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-lg transition group-hover:translate-x-1 ${category.accent}`}>→</span></div></Link>)}</div>
      </section>

      <section>
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="eyebrow">POPULAR RIGHT NOW</p><h2 className="section-title mt-2">Recently added products</h2><p className="mt-2 text-sm text-slate-500">Browse new items from approved local businesses.</p></div><Link href="/browse?type=shop" className="text-sm font-bold text-brand-700 hover:text-brand-800">Explore products →</Link></div>
        {listings.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center"><h3 className="font-bold text-slate-900">New products will appear here</h3><p className="mt-2 text-sm text-slate-500">Sellers can add photos, prices and descriptions from their seller dashboard.</p><Link href="/register" className="btn mt-4">Become a seller</Link></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{listings.map((item)=>{const shop=shopById.get(item.shop_id);return <Link key={item.id} href={`/shops/${item.shop_id}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-emerald-50">{item.image_url?<img src={item.image_url} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/>:<span className="text-4xl text-slate-300">▦</span>}</div><div className="p-4"><p className="truncate text-xs font-semibold text-slate-500">{shop?.name ?? "Local business"}</p><h3 className="mt-1 truncate font-extrabold text-slate-900">{item.title}</h3><p className="mt-2 text-lg font-black text-brand-700">{formatRWF(item.price_rwf)}</p><p className="mt-3 text-xs font-bold text-brand-700">View item →</p></div></Link>})}</div>}
      </section>

      <section>
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="eyebrow">POPULAR STORES</p><h2 className="section-title mt-2">Meet local businesses</h2><p className="mt-2 text-sm text-slate-500">Explore approved sellers and discover what they offer.</p></div><Link href="/browse" className="text-sm font-bold text-brand-700 hover:text-brand-800">See all →</Link></div>
        {shops.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><h3 className="font-bold text-slate-900">Your next favourite business could be here</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">No approved businesses to feature just yet. Are you a seller? Set up your business and introduce yourself to new customers.</p><Link href="/register" className="btn mt-5">Become a seller</Link></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{shops.slice(0,4).map((shop)=><ShopCard key={shop.id} shop={shop}/>)}</div>}
      </section>

      <section className="overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-10 text-white sm:px-10 sm:py-12">
        <div className="grid items-center gap-7 md:grid-cols-[1fr_auto]"><div><p className="eyebrow text-emerald-300">HOW TRADEBRIDGE WORKS</p><h2 className="mt-3 max-w-2xl text-2xl font-black tracking-tight sm:text-3xl">Find it. Choose it. Connect with the seller.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Browse local businesses, compare product details and prices, then follow the available ordering or contact options on each business page.</p></div><Link href="/browse" className="inline-flex items-center justify-center rounded-xl bg-emerald-300 px-6 py-3.5 text-sm font-extrabold text-slate-950 transition hover:bg-emerald-200">Start exploring ↗</Link></div>
        <div className="mt-8 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-3">{[{n:"01",title:"Browse & search",text:"Find shops, restaurants and salons."},{n:"02",title:"Compare items",text:"Check photos, descriptions and prices."},{n:"03",title:"Order or contact",text:"Use the options provided by each business."}].map((step)=><div key={step.n} className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-sm font-black text-emerald-300">{step.n}</p><h3 className="mt-2 font-bold">{step.title}</h3><p className="mt-1 text-sm leading-5 text-slate-300">{step.text}</p></div>)}</div>
      </section>

      <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50 px-6 py-8 sm:px-10 sm:py-10"><div className="grid items-center gap-6 md:grid-cols-[1fr_auto]"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-800">GROW WITH TRADEBRIDGE</p><h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Your business deserves to be discovered.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Create a seller account, add your products or menu items with photos, and reach more customers across Kigali.</p></div><Link href="/register" className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-6 py-3.5 text-sm font-extrabold text-white transition hover:bg-emerald-800">Start selling ↗</Link></div></section>
    </div>
  );
}
