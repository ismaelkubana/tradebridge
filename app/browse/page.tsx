import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ShopCard from "@/components/ShopCard";
import { KIGALI_DISTRICTS, SHOP_TYPE_PLURAL, type Shop, type ShopType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; district?: string; q?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const type = (["shop", "restaurant", "salon"] as string[]).includes(params.type ?? "") ? params.type as ShopType : undefined;
  const district = KIGALI_DISTRICTS.includes(params.district ?? "") ? params.district : undefined;
  const q = (params.q ?? "").replace(/[%,()]/g, " ").trim().slice(0, 100);
  const sort = ["name", "newest"].includes(params.sort ?? "") ? params.sort : "name";

  const supabase = await createClient();
  let query = supabase.from("shops").select("*").eq("status", "approved");
  if (type) query = query.eq("type", type);
  if (district) query = query.eq("district", district);
  if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  query = sort === "newest" ? query.order("created_at", { ascending: false }) : query.order("name", { ascending: true });
  const { data, error } = await query;
  const shops = (data as Shop[]) ?? [];

  const tabs: { label: string; value?: ShopType }[] = [
    { label: "All businesses" },
    { label: SHOP_TYPE_PLURAL.shop, value: "shop" },
    { label: SHOP_TYPE_PLURAL.restaurant, value: "restaurant" },
    { label: SHOP_TYPE_PLURAL.salon, value: "salon" },
  ];
  const queryString = (nextType?: ShopType) => {
    const values = new URLSearchParams();
    if (nextType) values.set("type", nextType);
    if (q) values.set("q", q);
    if (district) values.set("district", district);
    if (sort !== "name") values.set("sort", sort);
    return `/browse${values.size ? `?${values.toString()}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-6 py-9 text-white sm:px-10 sm:py-12">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-emerald-300">THE TRADEBRIDGE MARKETPLACE</p>
        <div className="mt-3 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Find your next local favourite.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Explore approved shops, restaurants and salons around Kigali. Search by name, choose a category and narrow down your options.</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4"><p className="text-2xl font-black">{shops.length}</p><p className="mt-1 text-xs font-medium text-slate-300">matching {shops.length === 1 ? "business" : "businesses"}</p></div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap gap-2" aria-label="Business categories">
          {tabs.map((tab) => {
            const active = type === tab.value;
            return <Link key={tab.label} href={queryString(tab.value)} aria-current={active ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-bold transition ${active ? "bg-brand-700 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-700"}`}>{tab.label}</Link>;
          })}
        </div>

        <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_190px_170px_auto] lg:items-end">
          {type && <input type="hidden" name="type" value={type} />}
          <div><label className="label" htmlFor="q">Search businesses</label><input id="q" name="q" defaultValue={q} maxLength={100} placeholder="Try a name or keyword" className="input" /></div>
          <div><label className="label" htmlFor="district">Location</label><select id="district" name="district" defaultValue={district ?? ""} className="input"><option value="">All districts</option>{KIGALI_DISTRICTS.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
          <div><label className="label" htmlFor="sort">Sort businesses</label><select id="sort" name="sort" defaultValue={sort} className="input"><option value="name">Name: A–Z</option><option value="newest">Recently added</option></select></div>
          <button className="btn min-h-11" type="submit">Apply filters <span className="ml-1">→</span></button>
          {(q || district || sort !== "name") && <Link href={type ? `/browse?type=${type}` : "/browse"} className="text-sm font-semibold text-slate-500 hover:text-brand-700 sm:col-span-2 lg:col-span-4">Clear all filters</Link>}
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">Explore local</p><h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{type ? SHOP_TYPE_PLURAL[type] : "All businesses"}</h2></div><p className="text-xs text-slate-500">Showing {shops.length} {shops.length === 1 ? "result" : "results"}</p></div>
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">We couldn't load businesses right now. Please refresh and try again.</div> : shops.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-2xl">⌕</span><h3 className="mt-4 text-lg font-extrabold text-slate-900">No businesses match those filters</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Try another search term or clear a filter to discover more local businesses.</p><Link href="/browse" className="btn mt-5">Clear filters</Link></div>
        ) : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{shops.map((shop) => <ShopCard key={shop.id} shop={shop} />)}</div>}
      </section>
    </div>
  );
}
