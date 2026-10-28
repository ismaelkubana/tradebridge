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
  const [{ data: billing }, { count: listingCount }, { data: orders }] = await Promise.all([
    supabase.from("seller_billing").select("trial_ends_at, registration_paid_at").eq("seller_id", profile.id).maybeSingle(),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
    supabase.from("orders").select("status,total_rwf").eq("shop_id", shop.id),
  ]);

  const sellingLocked = !billing || (!billing.registration_paid_at && new Date(billing.trial_ends_at).getTime() <= Date.now());
  const trialEnd = billing?.trial_ends_at ? new Date(billing.trial_ends_at) : null;
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

      {sellingLocked ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Your 14-day free trial has ended.</strong> New listings and incoming orders are blocked until the RWF 5,000 registration fee is verified. Your existing records are preserved.
          <Link href="/seller/billing" className="ml-2 font-semibold underline">Pay registration fee →</Link>
        </div>
      ) : !billing?.registration_paid_at && trialEnd ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          Your free trial is active until {trialEnd.toLocaleDateString("en-RW")}. Registration costs RWF 5,000 after the trial.
          <Link href="/seller/billing" className="ml-2 font-semibold underline">Billing details →</Link>
        </div>
      ) : null}

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
