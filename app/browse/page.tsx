import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ShopCard from "@/components/ShopCard";
import { KIGALI_DISTRICTS, SHOP_TYPE_PLURAL, type Shop, type ShopType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; district?: string; q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const type = (["shop", "restaurant", "salon"] as string[]).includes(resolvedSearchParams.type ?? "")
    ? (resolvedSearchParams.type as ShopType)
    : undefined;
  const district = KIGALI_DISTRICTS.includes(resolvedSearchParams.district ?? "") ? resolvedSearchParams.district : undefined;
  // Strip characters that have special meaning in the search filter syntax.
  const q = (resolvedSearchParams.q ?? "").replace(/[%,()]/g, " ").trim();

  const supabase = await createClient();
  let query = supabase.from("shops").select("*").eq("status", "approved").order("name");
  if (type) query = query.eq("type", type);
  if (district) query = query.eq("district", district);
  if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  const { data } = await query;
  const shops = (data as Shop[]) ?? [];

  const tabs: { label: string; value?: ShopType }[] = [
    { label: "All" },
    { label: SHOP_TYPE_PLURAL.shop, value: "shop" },
    { label: SHOP_TYPE_PLURAL.restaurant, value: "restaurant" },
    { label: SHOP_TYPE_PLURAL.salon, value: "salon" },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Browse</h1>

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.value ? `/browse?type=${t.value}` : "/browse"}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              type === t.value ? "bg-brand-600 text-white" : "bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <form className="mb-6 grid gap-3 sm:grid-cols-[1fr_200px_auto]">
        {type && <input type="hidden" name="type" value={type} />}
        <input name="q" defaultValue={q} placeholder="Search by name or description" className="input" />
        <select name="district" defaultValue={district ?? ""} className="input">
          <option value="">All districts</option>
          {KIGALI_DISTRICTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <button className="btn" type="submit">Search</button>
      </form>

      {shops.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing found. Try another search.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shops.map((s) => (
            <ShopCard key={s.id} shop={s} />
          ))}
        </div>
      )}
    </div>
  );
}
