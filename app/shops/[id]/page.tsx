import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddToCart from "@/components/AddToCart";
import AddToWishlist from "@/components/AddToWishlist";
import { submitListingFeedback } from "../actions";
import { formatRWF } from "@/lib/format";
import { SHOP_TYPE_LABEL, type Listing, type Shop } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; sort?: string; stock?: string; feedback_success?: string; feedback_error?: string }>;
}) {
  const [{ id }, filters] = await Promise.all([params, searchParams]);
  const q = (filters.q ?? "").trim().slice(0, 100);
  const sort = ["price_low", "price_high", "newest", "name"].includes(filters.sort ?? "") ? filters.sort! : "newest";
  const inStockOnly = filters.stock === "yes";

  const supabase = await createClient();
  const { data: shopData } = await supabase.from("shops").select("*").eq("id", id).maybeSingle();
  const shop = shopData as Shop | null;
  if (!shop || shop.status !== "approved") notFound();

  const { data: listingData, error: listingsError } = await supabase
    .from("listings")
    .select("*")
    .eq("shop_id", shop.id)
    .eq("active", true)
    .order("created_at", { ascending: false });
  let listings = (listingData as Listing[]) ?? [];
  const heading = shop.type === "restaurant" ? "Menu" : shop.type === "salon" ? "Services" : "Products";
  if (q) {
    const term = q.toLocaleLowerCase();
    listings = listings.filter((item) => item.title.toLocaleLowerCase().includes(term) || (item.description ?? "").toLocaleLowerCase().includes(term));
  }
  if (inStockOnly) listings = listings.filter((item) => item.stock === null || item.stock > 0);
  listings = [...listings].sort((a, b) => {
    if (sort === "price_low") return a.price_rwf - b.price_rwf;
    if (sort === "price_high") return b.price_rwf - a.price_rwf;
    if (sort === "name") return a.title.localeCompare(b.title);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const { data: feedbackRows } = listings.length
    ? await supabase.from("listing_feedback").select("listing_id,liked,image_url,comment").in("listing_id", listings.map((item) => item.id)).eq("liked", true)
    : { data: [] as { listing_id: string; liked: boolean; image_url: string | null; comment: string }[] };
  const feedbackByListing = new Map<string, { count: number; photos: string[] }>();
  for (const feedback of feedbackRows ?? []) {
    const current = feedbackByListing.get(feedback.listing_id) ?? { count: 0, photos: [] };
    current.count += 1;
    if (feedback.image_url && current.photos.length < 3) current.photos.push(feedback.image_url);
    feedbackByListing.set(feedback.listing_id, current);
  }
  const { data: authData } = await supabase.auth.getUser();
  const { data: viewerProfile } = authData.user
    ? await supabase.from("profiles").select("role").eq("id", authData.user.id).maybeSingle()
    : { data: null };
  return (
    <div className="space-y-8">
      <Link href="/browse" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-brand-700"><span aria-hidden="true">←</span> Back to marketplace</Link>

      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white sm:p-10">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10 shadow-[0_0_0_45px_rgba(255,255,255,0.025),0_0_0_90px_rgba(255,255,255,0.02)]" aria-hidden="true" />
        <div className="relative grid gap-7 md:grid-cols-[1fr_auto] md:items-end">
          <div><span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-200">{SHOP_TYPE_LABEL[shop.type]} · VERIFIED BUSINESS</span><h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{shop.name}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{shop.description || "Explore products and services from this local business."}</p><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-300"><span>⌖ {[shop.address, shop.district].filter(Boolean).join(", ") || "Kigali, Rwanda"}</span>{shop.phone && <span>☎ {shop.phone}</span>}</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:min-w-36"><p className="text-2xl font-black">{listings.length}</p><p className="mt-1 text-xs font-medium text-slate-300">{listings.length === 1 ? "item matching filters" : "items matching filters"}</p></div>
        </div>
      </section>

      {filters.feedback_success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Thanks! Your thumbs-up and feedback were saved.</p>}
      {filters.feedback_error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{filters.feedback_error}</p>}

      <section>
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">Shop collection</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{heading}</h2><p className="mt-2 text-sm text-slate-500">Find the right item and compare options from this business.</p></div><p className="text-xs font-medium text-slate-500">Prices shown in Rwandan francs (RWF)</p></div>

        <form className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(180px,1fr)_190px_auto_auto] sm:items-end">
          <div><label htmlFor="listing-q" className="label">Search {heading.toLowerCase()}</label><input id="listing-q" name="q" defaultValue={q} maxLength={100} placeholder="Search by item name" className="input" /></div>
          <div><label htmlFor="sort" className="label">Sort by</label><select id="sort" name="sort" defaultValue={sort} className="input"><option value="newest">Recently added</option><option value="price_low">Price: low to high</option><option value="price_high">Price: high to low</option><option value="name">Name: A–Z</option></select></div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700"><input type="checkbox" name="stock" value="yes" defaultChecked={inStockOnly} className="h-4 w-4 accent-emerald-700" /> Available only</label>
          <button className="btn min-h-11" type="submit">Find items</button>
          {(q || inStockOnly || sort !== "newest") && <Link href={`/shops/${shop.id}`} className="text-sm font-semibold text-slate-500 hover:text-brand-700 sm:col-span-4">Clear filters</Link>}
        </form>

        {listingsError ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">We couldn't load this business's listings. Please try again later.</div> : listings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-2xl">⌕</span><h3 className="mt-4 text-lg font-extrabold text-slate-900">{q || inStockOnly ? "No items match your filters" : "Nothing listed just yet"}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{q || inStockOnly ? "Try a different keyword or remove the availability filter." : "This business hasn't published any active products or services yet. Check back soon."}</p>{(q || inStockOnly || sort !== "newest") && <Link href={`/shops/${shop.id}`} className="btn mt-5">Clear filters</Link>}</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => {
              const soldOut = listing.stock !== null && listing.stock <= 0;
              return <article key={listing.id} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-slate-900/[0.07]">
                <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-50">
                  {listing.image_url ? <img src={listing.image_url} alt={listing.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex flex-col items-center text-slate-300"><span className="text-5xl">{shop.type === "restaurant" ? "✳" : shop.type === "salon" ? "✦" : "▦"}</span><span className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.2em]">TradeBridge</span></div>}
                  <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide shadow-sm ${soldOut ? "bg-slate-900/90 text-white" : "bg-white/95 text-emerald-800"}`}>{soldOut ? "Sold out" : "Available"}</span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-1 font-extrabold text-slate-900">{listing.title}</h3>
                  <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{listing.description || "Contact the seller for more details."}</p>
                  <div className="mt-4 flex items-end justify-between gap-2 border-t border-slate-100 pt-4"><div><p className="text-lg font-black tracking-tight text-brand-700">{formatRWF(listing.price_rwf)}</p>{listing.duration_min && <p className="mt-1 text-xs text-slate-500">{listing.duration_min} min</p>}{listing.stock !== null && listing.stock > 0 && listing.stock <= 5 && <p className="mt-1 text-xs font-semibold text-amber-700">Only {listing.stock} left</p>}</div><div className="flex items-center gap-2"><AddToWishlist item={{ listingId: listing.id, shopId: shop.id, shopName: shop.name, title: listing.title, price: listing.price_rwf, imageUrl: listing.image_url }} /><AddToCart shop={shop} listing={listing} /></div></div>
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-600">👍 {feedbackByListing.get(listing.id)?.count ?? 0} likes</p>
                    {(feedbackByListing.get(listing.id)?.photos ?? []).length > 0 && <div className="mt-2 flex gap-2">{(feedbackByListing.get(listing.id)?.photos ?? []).map((photo) => <img key={photo} src={photo} alt="Customer product feedback" loading="lazy" className="h-12 w-12 rounded-lg object-cover" />)}</div>}
                    {viewerProfile?.role === "buyer" ? <form action={submitListingFeedback} className="mt-2 space-y-2">
                      <input type="hidden" name="listing_id" value={listing.id} /><input type="hidden" name="shop_id" value={shop.id} />
                      <label className="block text-xs text-slate-600">Add a photo (optional, JPG/PNG/WebP up to 3 MB)</label>
                      <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-xs text-slate-600" />
                      <input name="comment" maxLength={500} placeholder="Optional short feedback" className="input !py-2 text-xs" />
                      <button type="submit" className="btn-outline btn-sm w-full">👍 Like and share feedback</button>
                    </form> : <Link href="/login?next=/browse" className="mt-2 inline-block text-xs font-semibold text-brand-700 hover:underline">Sign in as a buyer to like and add a photo</Link>}
                  </div>
                </div>
              </article>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
