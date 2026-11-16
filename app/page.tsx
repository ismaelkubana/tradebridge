import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ShopCard from "@/components/ShopCard";
import { BRAND } from "@/lib/brand";
import { formatRWF } from "@/lib/format";
import type { Listing, Shop } from "@/lib/types";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  { type: "shop", label: "Shops & groceries", detail: "Everyday essentials and local finds", icon: "▦", tone: "category-blue" },
  { type: "restaurant", label: "Food & restaurants", detail: "Meals, snacks and neighbourhood favourites", icon: "✳", tone: "category-orange" },
  { type: "salon", label: "Beauty & salons", detail: "Personal care and feel-good services", icon: "✦", tone: "category-pink" },
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
    <div className="marketplace-home space-y-14 pb-10 sm:space-y-20">
      {!configured && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Setup needed:</strong> add your Supabase keys to <code>.env.local</code> to display live businesses.</div>}

      <section className="market-hero relative isolate overflow-hidden rounded-[2rem]">
        <div className="market-hero-glow market-hero-glow-a" aria-hidden="true" />
        <div className="market-hero-glow market-hero-glow-b" aria-hidden="true" />
        <div className="relative z-10 grid items-center gap-10 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.08fr_.92fr] lg:px-14 lg:py-16">
          <div className="max-w-2xl">
            <span className="market-kicker"><span className="h-2 w-2 rounded-full bg-[#f17b5a]" /> KIGALI’S LOCAL MARKETPLACE</span>
            <h1 className="mt-6 text-4xl font-black leading-[1.04] tracking-[-0.045em] text-white sm:text-5xl lg:text-[3.65rem]">Good finds.<br /><span className="text-[#f6b29d]">Closer to home.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/75 sm:text-lg">Discover shops, restaurants and services around {BRAND.city}. Find what you need, connect with local sellers and keep business moving in Rwanda.</p>
            <form action="/browse" className="market-search mt-8 flex max-w-2xl flex-col gap-2 p-2 sm:flex-row">
              <label className="flex min-w-0 flex-1 items-center gap-3 px-3"><span className="text-2xl text-slate-400" aria-hidden="true">⌕</span><input name="q" aria-label="Search marketplace" placeholder="What are you looking for today?" className="w-full border-0 bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0" /></label>
              <button type="submit" className="rounded-xl bg-[#f17b5a] px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#f17b5a]/20 transition hover:-translate-y-0.5 hover:bg-[#e96c4c]">Search TradeBridge <span aria-hidden="true">→</span></button>
            </form>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-white/65"><span>✓ Local businesses</span><span>✓ Clear product prices</span><span>✓ Easy ordering</span></div>
          </div>

          <div className="market-hero-showcase mx-auto w-full max-w-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-white/45">THE NEIGHBOURHOOD EDIT</p><p className="mt-1 text-lg font-extrabold text-white">A little bit of local.</p></div><span className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-bold text-white/75">KIGALI · RW</span></div>
            <div className="grid grid-cols-2 gap-3 pt-4">
              <Link href="/browse?type=restaurant" className="showcase-tile showcase-food"><span className="text-4xl" aria-hidden="true">🍲</span><span className="mt-7 block text-sm font-extrabold text-slate-950">Something tasty</span><span className="mt-1 block text-xs text-slate-600">Restaurants & cafés</span><span className="mt-4 block text-xs font-extrabold text-slate-900">Explore food ↗</span></Link>
              <Link href="/browse?type=shop" className="showcase-tile showcase-shop"><span className="text-4xl" aria-hidden="true">🛍️</span><span className="mt-7 block text-sm font-extrabold text-slate-950">Everyday finds</span><span className="mt-1 block text-xs text-slate-600">Shops & essentials</span><span className="mt-4 block text-xs font-extrabold text-slate-900">Shop local ↗</span></Link>
              <div className="col-span-2 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.07] p-4"><div><p className="text-sm font-extrabold text-white">Have a business?</p><p className="mt-1 text-xs leading-5 text-white/60">Put your products in front of local customers.</p></div><Link href="/register" className="shrink-0 rounded-xl bg-white px-4 py-3 text-xs font-extrabold text-[#183b32] transition hover:bg-[#f6b29d]">Start selling ↗</Link></div>
            </div>
          </div>
        </div>
        <div className="market-hero-bottom" aria-hidden="true"><span>TRADEBRIDGE</span><span>LOCAL COMMERCE, CONNECTED</span><span>RWANDA 🇷🇼</span></div>
      </section>

      <section className="market-trust-grid grid gap-3 rounded-2xl border border-[#eee9e2] bg-white p-4 sm:grid-cols-3 sm:p-5">
        {[{icon:"⌕",title:"Discover nearby",text:"Explore businesses in your community."},{icon:"▣",title:"Shop with clarity",text:"See product photos, details and prices."},{icon:"♡",title:"Back local business",text:"Help neighbourhood sellers grow."}].map((item)=><div key={item.title} className="flex items-center gap-3 p-2"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#fdf0eb] text-xl font-bold text-[#d86b4e]">{item.icon}</span><div><h2 className="font-extrabold text-[#1b302b]">{item.title}</h2><p className="mt-1 text-sm text-slate-500">{item.text}</p></div></div>)}
      </section>

      <section>
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="eyebrow">EXPLORE THE MARKET</p><h2 className="section-title mt-2">What are you in the mood for?</h2><p className="mt-2 text-sm text-slate-500">A simple way to find the right local business.</p></div><Link href="/browse" className="text-sm font-extrabold text-brand-700 hover:text-brand-800">Browse everything →</Link></div>
        <div className="grid gap-4 md:grid-cols-3">{CATEGORIES.map((category)=><Link key={category.type} href={`/browse?type=${category.type}`} className={`market-category group ${category.tone}`}><div className="flex items-start justify-between"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/85 text-3xl shadow-sm">{category.icon}</span><span className="market-category-arrow">↗</span></div><div className="mt-8"><h3 className="text-lg font-black text-[#1b302b]">{category.label}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">{category.detail}</p></div></Link>)}</div>
      </section>

      <section>
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="eyebrow">FRESH FROM LOCAL SELLERS</p><h2 className="section-title mt-2">Recently added products</h2><p className="mt-2 text-sm text-slate-500">New finds from approved businesses around Kigali.</p></div><Link href="/browse?type=shop" className="text-sm font-extrabold text-brand-700 hover:text-brand-800">Explore products →</Link></div>
        {listings.length === 0 ? <div className="market-empty"><span className="text-3xl" aria-hidden="true">✳</span><h3 className="mt-3 font-extrabold text-[#1b302b]">Your next favourite find is on its way</h3><p className="mt-2 text-sm text-slate-500">New products from local sellers will appear here.</p><Link href="/browse" className="btn mt-4">Explore marketplace</Link></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{listings.map((item)=>{const shop=shopById.get(item.shop_id);return <Link key={item.id} href={`/shops/${item.shop_id}`} className="market-product group"><div className="market-product-image">{item.image_url?<img src={item.image_url} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/>:<span className="text-4xl text-slate-300" aria-hidden="true">▦</span>}<span className="market-product-tag">LOCAL FIND</span></div><div className="p-4"><p className="truncate text-xs font-semibold text-slate-500">{shop?.name ?? "Local business"}</p><h3 className="mt-1 truncate font-extrabold text-[#1b302b]">{item.title}</h3><div className="mt-3 flex items-center justify-between"><p className="text-lg font-black text-brand-700">{formatRWF(item.price_rwf)}</p><span className="grid h-9 w-9 place-items-center rounded-full bg-[#fdf0eb] text-sm font-bold text-[#d86b4e] transition group-hover:bg-[#f17b5a] group-hover:text-white">↗</span></div></div></Link>})}</div>}
      </section>

      <section>
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="eyebrow">MEET THE NEIGHBOURHOOD</p><h2 className="section-title mt-2">Local businesses to know</h2><p className="mt-2 text-sm text-slate-500">Get to know approved sellers and what they offer.</p></div><Link href="/browse" className="text-sm font-extrabold text-brand-700 hover:text-brand-800">See all businesses →</Link></div>
        {shops.length === 0 ? <div className="market-empty"><span className="text-3xl" aria-hidden="true">⌂</span><h3 className="mt-3 font-extrabold text-[#1b302b]">Discover a new local favourite</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Approved businesses will appear here. If you run a business, create a seller account to get started.</p><Link href="/register" className="btn mt-5">Become a seller</Link></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{shops.slice(0,4).map((shop)=><ShopCard key={shop.id} shop={shop}/>)}</div>}
      </section>

      <section className="market-how rounded-[2rem] px-6 py-9 text-white sm:px-10 sm:py-11">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]"><div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#f6b29d]">HOW IT WORKS</p><h2 className="mt-3 max-w-2xl text-2xl font-black tracking-tight sm:text-3xl">Find it. Choose it. Connect locally.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">Browse local businesses, compare product details and prices, then follow the ordering or contact options on each business page.</p></div><Link href="/browse" className="inline-flex items-center justify-center rounded-xl bg-[#f17b5a] px-6 py-3.5 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#e96c4c]">Start exploring ↗</Link></div>
        <div className="mt-8 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">{[{n:"01",title:"Browse & search",text:"Find shops, restaurants and salons."},{n:"02",title:"Compare options",text:"Review photos, details and prices."},{n:"03",title:"Connect & order",text:"Choose the available seller options."}].map((step)=><div key={step.n} className="rounded-xl border border-white/10 bg-white/[.04] p-4"><p className="text-sm font-black text-[#f6b29d]">{step.n}</p><h3 className="mt-2 font-bold">{step.title}</h3><p className="mt-1 text-sm leading-5 text-white/60">{step.text}</p></div>)}</div>
      </section>

      <section className="market-seller-cta rounded-[2rem] px-6 py-8 sm:px-10 sm:py-10"><div className="grid items-center gap-6 md:grid-cols-[1fr_auto]"><div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#b85b43]">GROW WITH TRADEBRIDGE</p><h2 className="mt-3 text-2xl font-black tracking-tight text-[#1b302b]">Your business deserves to be discovered.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Create a seller account, add products or menu items with photos, and reach more customers across Kigali.</p></div><Link href="/register" className="inline-flex items-center justify-center rounded-xl bg-[#1b4036] px-6 py-3.5 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#245849]">Start selling ↗</Link></div></section>
    </div>
  );
}
