import { requireRole, getMyShop } from "@/lib/auth";
import { saveShop } from "../actions";
import { KIGALI_DISTRICTS, SHOP_TYPE_LABEL, type ShopType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ShopProfilePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const profile = await requireRole(["seller"]);
  const shop = await getMyShop(profile.id);

  return (
    <div className="card max-w-xl">
      <h1 className="mb-4 text-xl font-bold">{shop ? "Business profile" : "Create your business"}</h1>

      {resolvedSearchParams.error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{resolvedSearchParams.error}</p>
      )}

      <form action={saveShop} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Business name</label>
          <input id="name" name="name" required defaultValue={shop?.name} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="type">Business type</label>
          <select id="type" name="type" defaultValue={shop?.type ?? "shop"} className="input">
            {(Object.keys(SHOP_TYPE_LABEL) as ShopType[]).map((t) => (
              <option key={t} value={t}>{SHOP_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={3} defaultValue={shop?.description} className="input" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="district">District</label>
            <select id="district" name="district" defaultValue={shop?.district ?? ""} className="input">
              <option value="">Select…</option>
              {KIGALI_DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="phone">Business phone</label>
            <input id="phone" name="phone" type="tel" defaultValue={shop?.phone} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="address">Address / landmark</label>
          <input id="address" name="address" defaultValue={shop?.address} className="input" />
        </div>
        <button type="submit" className="btn">{shop ? "Save changes" : "Submit for approval"}</button>
      </form>
    </div>
  );
}
