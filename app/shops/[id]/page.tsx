import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddToCart from "@/components/AddToCart";
import { formatRWF } from "@/lib/format";
import { SHOP_TYPE_LABEL, type Listing, type Shop } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ShopPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: shopData } = await supabase.from("shops").select("*").eq("id", params.id).maybeSingle();
  const shop = shopData as Shop | null;
  if (!shop || shop.status !== "approved") notFound();

  const { data: listingData } = await supabase
    .from("listings")
    .select("*")
    .eq("shop_id", shop.id)
    .eq("active", true)
    .order("created_at", { ascending: false });
  const listings = (listingData as Listing[]) ?? [];

  const heading =
    shop.type === "restaurant" ? "Menu" : shop.type === "salon" ? "Services" : "Products";

  return (
    <div className="space-y-6">
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          {SHOP_TYPE_LABEL[shop.type]}
        </p>
        <h1 className="mt-1 text-2xl font-bold">{shop.name}</h1>
        <p className="mt-2 text-gray-600">{shop.description}</p>
        <p className="mt-3 text-sm text-gray-500">
          📍 {[shop.address, shop.district].filter(Boolean).join(", ") || "Kigali"}
          {shop.phone && <> · 📞 {shop.phone}</>}
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold">{heading}</h2>
        {listings.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing listed yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
            {listings.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{l.title}</p>
                  {l.description && <p className="text-sm text-gray-500">{l.description}</p>}
                  <p className="mt-1 text-sm font-semibold text-brand-700">
                    {formatRWF(l.price_rwf)}
                    {l.duration_min && <span className="font-normal text-gray-500"> · {l.duration_min} min</span>}
                    {l.stock !== null && l.stock > 0 && l.stock <= 5 && (
                      <span className="font-normal text-amber-600"> · only {l.stock} left</span>
                    )}
                  </p>
                </div>
                <AddToCart shop={shop} listing={l} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
