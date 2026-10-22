import Link from "next/link";
import { requireRole, getMyShop } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatRWF } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SellerOverviewPage() {
  const profile = await requireRole(["seller"]);
  const shop = await getMyShop(profile.id);

  if (!shop) {
    return (
      <div className="card">
        <h1 className="text-xl font-bold">Welcome! Set up your business</h1>
        <p className="mt-2 text-gray-600">
          Tell us about your shop, restaurant or salon. After an admin reviews it, customers will see it on TradeBridge.
        </p>
        <Link href="/seller/shop" className="btn mt-4">Create business profile</Link>
      </div>
    );
  }

  const supabase = createClient();
  const [{ count: listingCount }, { data: orders }] = await Promise.all([
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
    supabase.from("orders").select("status,total_rwf").eq("shop_id", shop.id),
  ]);

  const all = orders ?? [];
  const newOrders = all.filter((o) => o.status === "new").length;
  const revenue = all.filter((o) => o.status === "completed").reduce((s, o) => s + o.total_rwf, 0);

  const stats = [
    { label: "New orders", value: String(newOrders) },
    { label: "Total orders", value: String(all.length) },
    { label: "Listings", value: String(listingCount ?? 0) },
    { label: "Completed sales", value: formatRWF(revenue) },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Overview</h1>

      {shop.status === "pending" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Your business is <strong>waiting for admin approval</strong>. You can add your products, menu or services
          now. Customers will see them once you are approved.
        </div>
      )}
      {shop.status === "suspended" && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          Your business is <strong>suspended</strong> and hidden from customers. Please contact TradeBridge support.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-xs uppercase tracking-wide text-gray-500">{s.label}</p>
            <p className="mt-1 text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Link href="/seller/listings" className="btn">Manage listings</Link>
        <Link href="/seller/orders" className="btn-outline">View orders</Link>
      </div>
    </div>
  );
}
