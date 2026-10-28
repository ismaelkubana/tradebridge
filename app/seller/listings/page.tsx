import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole, getMyShop } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveListing, toggleListing, deleteListing } from "../actions";
import { formatRWF } from "@/lib/format";
import type { Listing } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const profile = await requireRole(["seller"]);
  const shop = await getMyShop(profile.id);
  if (!shop) redirect("/seller/shop");

  const supabase = await createClient();
  const { data: billing } = await supabase.from("seller_billing").select("trial_ends_at, registration_paid_at").eq("seller_id", profile.id).maybeSingle();
  const sellingLocked = !billing || (!billing.registration_paid_at && new Date(billing.trial_ends_at).getTime() <= Date.now());
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false });
  const listings = (data as Listing[]) ?? [];
  const editing = listings.find((l) => l.id === resolvedSearchParams.edit);
  const noun = shop.type === "restaurant" ? "menu item" : shop.type === "salon" ? "service" : "product";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold capitalize">{noun}s</h1>
        <p className="mt-1 text-sm text-slate-500">Add a clear photo so customers can see what they are ordering before you publish it.</p>
      </div>

      {sellingLocked && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Your 14-day free trial has ended.</strong> You cannot add or reactivate listings or receive new orders until your RWF 5,000 registration fee is verified.
          <Link href="/seller/billing" className="ml-2 font-semibold underline">Go to billing</Link>
        </div>
      )}

      {!sellingLocked && <div className="card">
        <h2 className="mb-3 font-semibold">{editing ? `Edit ${noun}` : `Add a ${noun}`}</h2>
        {resolvedSearchParams.error && (
          <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{resolvedSearchParams.error}</p>
        )}
        <form action={saveListing} encType="multipart/form-data" className="grid gap-4 sm:grid-cols-2">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <input type="hidden" name="existing_image_url" value={editing?.image_url ?? ""} />
          <div className="sm:col-span-2">
            <label className="label" htmlFor="title">Name</label>
            <input id="title" name="title" required defaultValue={editing?.title} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={2} defaultValue={editing?.description} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="image">Product photo <span className="font-normal text-slate-500">(optional, JPG/PNG/WebP up to 3 MB)</span></label>
            {editing?.image_url && <div className="mb-3 flex items-center gap-3"><img src={editing.image_url} alt={editing.title} className="h-20 w-20 rounded-xl border border-slate-200 object-cover" /><span className="text-xs text-slate-500">Current photo. Choose another image to replace it.</span></div>}
            <input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" className="input file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-bold file:text-emerald-800" />
            <p className="mt-1 text-xs text-slate-500">Use a real, well-lit photo of the item. The photo will appear to buyers after you publish the listing.</p>
          </div>
          <div>
            <label className="label" htmlFor="price_rwf">Price (RWF)</label>
            <input id="price_rwf" name="price_rwf" type="number" min={0} required defaultValue={editing?.price_rwf} className="input" />
          </div>
          {shop.type === "shop" && (
            <div>
              <label className="label" htmlFor="stock">Stock quantity</label>
              <input id="stock" name="stock" type="number" min={0} defaultValue={editing?.stock ?? ""} className="input" />
            </div>
          )}
          {shop.type === "salon" && (
            <div>
              <label className="label" htmlFor="duration_min">Duration (minutes)</label>
              <input id="duration_min" name="duration_min" type="number" min={1} defaultValue={editing?.duration_min ?? ""} className="input" />
            </div>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="btn">{editing ? "Save changes" : `Add ${noun}`}</button>
            {editing && <Link href="/seller/listings" className="btn-outline">Cancel</Link>}
          </div>
        </form>
      </div>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Photo</th><th className="th">Name</th><th className="th">Price</th>
              {shop.type === "shop" && <th className="th">Stock</th>}
              {shop.type === "salon" && <th className="th">Duration</th>}
              <th className="th">Visible</th><th className="th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {listings.length === 0 && (
              <tr><td className="td text-gray-500" colSpan={shop.type === "shop" || shop.type === "salon" ? 6 : 5}>Nothing here yet. Add your first {noun} above.</td></tr>
            )}
            {listings.map((l) => (
              <tr key={l.id}>
                <td className="td">{l.image_url ? <img src={l.image_url} alt={l.title} className="h-12 w-12 rounded-lg object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-lg bg-slate-100 text-xl text-slate-400">▦</span>}</td>
                <td className="td font-medium">{l.title}</td><td className="td">{formatRWF(l.price_rwf)}</td>
                {shop.type === "shop" && <td className="td">{l.stock === null ? "—" : l.stock === 0 ? <span className="font-semibold text-red-600">Out</span> : l.stock <= 5 ? <span className="font-semibold text-amber-600">{l.stock} (low)</span> : l.stock}</td>}
                {shop.type === "salon" && <td className="td">{l.duration_min ? `${l.duration_min} min` : "—"}</td>}
                <td className="td">{l.active ? "Yes" : "Hidden"}</td>
                <td className="td"><div className="flex flex-wrap items-center gap-2">
                  <Link href={`/seller/listings?edit=${l.id}`} className="btn-outline btn-sm">Edit</Link>
                  <form action={toggleListing}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="active" value={String(l.active)} /><button className="btn-outline btn-sm" type="submit">{l.active ? "Hide" : "Show"}</button></form>
                  <form action={deleteListing}><input type="hidden" name="id" value={l.id} /><button className="btn-danger" type="submit">Delete</button></form>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
