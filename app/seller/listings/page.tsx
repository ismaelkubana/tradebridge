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
  searchParams: { edit?: string; error?: string };
}) {
  const profile = await requireRole(["seller"]);
  const shop = await getMyShop(profile.id);
  if (!shop) redirect("/seller/shop");

  const supabase = createClient();
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false });
  const listings = (data as Listing[]) ?? [];
  const editing = listings.find((l) => l.id === searchParams.edit);

  const noun = shop.type === "restaurant" ? "menu item" : shop.type === "salon" ? "service" : "product";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold capitalize">{noun}s</h1>

      <div className="card">
        <h2 className="mb-3 font-semibold">{editing ? `Edit ${noun}` : `Add a ${noun}`}</h2>
        {searchParams.error && (
          <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>
        )}
        <form action={saveListing} className="grid gap-4 sm:grid-cols-2">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="sm:col-span-2">
            <label className="label" htmlFor="title">Name</label>
            <input id="title" name="title" required defaultValue={editing?.title} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={2} defaultValue={editing?.description} className="input" />
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
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Name</th>
              <th className="th">Price</th>
              {shop.type === "shop" && <th className="th">Stock</th>}
              {shop.type === "salon" && <th className="th">Duration</th>}
              <th className="th">Visible</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {listings.length === 0 && (
              <tr><td className="td text-gray-500" colSpan={5}>Nothing here yet. Add your first {noun} above.</td></tr>
            )}
            {listings.map((l) => (
              <tr key={l.id}>
                <td className="td font-medium">{l.title}</td>
                <td className="td">{formatRWF(l.price_rwf)}</td>
                {shop.type === "shop" && (
                  <td className="td">
                    {l.stock === null ? "—" : l.stock === 0 ? <span className="font-semibold text-red-600">Out</span> : l.stock <= 5 ? <span className="font-semibold text-amber-600">{l.stock} (low)</span> : l.stock}
                  </td>
                )}
                {shop.type === "salon" && <td className="td">{l.duration_min ? `${l.duration_min} min` : "—"}</td>}
                <td className="td">{l.active ? "Yes" : "Hidden"}</td>
                <td className="td">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/seller/listings?edit=${l.id}`} className="btn-outline btn-sm">Edit</Link>
                    <form action={toggleListing}>
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="active" value={String(l.active)} />
                      <button className="btn-outline btn-sm" type="submit">{l.active ? "Hide" : "Show"}</button>
                    </form>
                    <form action={deleteListing}>
                      <input type="hidden" name="id" value={l.id} />
                      <button className="btn-danger" type="submit">Delete</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
