import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatRWF } from "@/lib/format";

export const dynamic = "force-dynamic";

type RecentOrder = {
  id: string;
  total_rwf: number;
  status: string;
  created_at: string;
  shops: { name: string } | null;
};

type RecentShop = {
  id: string;
  name: string;
  type: string;
  district: string;
  status: string;
  created_at: string;
};

const statusTone: Record<string, string> = {
  new: "bg-sky-50 text-sky-700",
  confirmed: "bg-blue-50 text-blue-700",
  preparing: "bg-amber-50 text-amber-700",
  out_for_delivery: "bg-violet-50 text-violet-700",
  ready: "bg-indigo-50 text-indigo-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-rose-50 text-rose-700",
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  suspended: "bg-rose-50 text-rose-700",
};

function prettyStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-RW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const count = async (table: string, filter?: [string, string]) => {
    let query = supabase.from(table).select("id", { count: "exact", head: true });
    if (filter) query = query.eq(filter[0], filter[1]);
    const { count: result } = await query;
    return result ?? 0;
  };

  const [
    users,
    sellers,
    pendingShops,
    approvedShops,
    suspendedShops,
    orders,
    pendingPayments,
    { data: completedOrders },
    { data: recentOrderRows },
    { data: recentShopRows },
  ] = await Promise.all([
    count("profiles"),
    count("profiles", ["role", "seller"]),
    count("shops", ["status", "pending"]),
    count("shops", ["status", "approved"]),
    count("shops", ["status", "suspended"]),
    count("orders"),
    count("order_payments", ["status", "pending"]),
    supabase.from("orders").select("total_rwf").eq("status", "completed"),
    supabase.from("orders").select("id,total_rwf,status,created_at,shops(name)").order("created_at", { ascending: false }).limit(6),
    supabase.from("shops").select("id,name,type,district,status,created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const volume = (completedOrders ?? []).reduce((sum, row) => sum + Number(row.total_rwf ?? 0), 0);
  const recentOrders = (recentOrderRows ?? []) as unknown as RecentOrder[];
  const recentShops = (recentShopRows ?? []) as RecentShop[];

  const stats = [
    { label: "Registered users", value: users.toLocaleString(), note: "All customer and seller accounts", icon: "♙" },
    { label: "Active sellers", value: sellers.toLocaleString(), note: "Accounts with seller role", icon: "▣" },
    { label: "Approved businesses", value: approvedShops.toLocaleString(), note: "Visible on the marketplace", icon: "⌂" },
    { label: "Total orders", value: orders.toLocaleString(), note: "Orders across the platform", icon: "⇄" },
    { label: "Completed sales", value: formatRWF(volume), note: "Gross completed order value", icon: "R" },
    { label: "Pending payments", value: pendingPayments.toLocaleString(), note: "Awaiting administrator review", icon: "◷" },
  ];

  const quickLinks = [
    { href: "/admin/shops?status=pending", title: "Review businesses", description: `${pendingShops} waiting for approval`, icon: "⌂" },
    { href: "/admin/payments", title: "Verify payments", description: `${pendingPayments} payment reviews pending`, icon: "▣" },
    { href: "/admin/users", title: "Manage accounts", description: `${users} registered users`, icon: "♙" },
    { href: "/admin/orders", title: "Monitor orders", description: `${orders} total orders recorded`, icon: "⇄" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand-700">Platform administration</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-950">Dashboard overview</h2>
          <p className="mt-1 text-sm text-gray-500">Monitor marketplace activity and manage TradeBridge operations.</p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Live database metrics</span>
      </div>

      {(pendingShops > 0 || pendingPayments > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {pendingShops > 0 && (
            <Link href="/admin/shops?status=pending" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 transition hover:border-amber-300">
              <p className="text-sm font-bold text-amber-950">Business approvals needed</p>
              <p className="mt-1 text-sm text-amber-800">{pendingShops} business{pendingShops === 1 ? "" : "es"} awaiting review. Check the submitted business details.</p>
              <span className="mt-3 inline-block text-xs font-bold text-amber-900">Review businesses →</span>
            </Link>
          )}
          {pendingPayments > 0 && (
            <Link href="/admin/payments" className="rounded-2xl border border-sky-200 bg-sky-50 p-4 transition hover:border-sky-300">
              <p className="text-sm font-bold text-sky-950">Payments awaiting verification</p>
              <p className="mt-1 text-sm text-sky-800">{pendingPayments} transaction{pendingPayments === 1 ? "" : "s"} need an administrator decision.</p>
              <span className="mt-3 inline-block text-xs font-bold text-sky-900">Review payments →</span>
            </Link>
          )}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Marketplace statistics">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 font-bold text-brand-700">{stat.icon}</span>
            </div>
            <p className="mt-3 break-words text-2xl font-bold tracking-tight text-gray-950">{stat.value}</p>
            <p className="mt-1 text-xs text-gray-500">{stat.note}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-950">Quick actions</h3>
            <p className="text-xs text-gray-500">Common administration tasks</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href} className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 font-bold text-gray-700 group-hover:bg-brand-50 group-hover:text-brand-700">{item.icon}</span>
              <p className="mt-3 text-sm font-bold text-gray-900">{item.title}</p>
              <p className="mt-1 text-xs text-gray-500">{item.description}</p>
              <p className="mt-3 text-xs font-semibold text-brand-700">Open section →</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h3 className="font-bold text-gray-950">Latest orders</h3>
              <p className="text-xs text-gray-500">Most recently created orders</p>
            </div>
            <Link href="/admin/orders" className="text-xs font-semibold text-brand-700 hover:underline">View all</Link>
          </div>
          {recentOrders.length ? (
            <div className="divide-y divide-gray-100">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{order.shops?.name || "TradeBridge order"}</p>
                    <p className="mt-1 text-xs text-gray-500">#{order.id.slice(0, 8)} · {dateLabel(order.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatRWF(Number(order.total_rwf ?? 0))}</p>
                    <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${statusTone[order.status] || "bg-gray-100 text-gray-700"}`}>{prettyStatus(order.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="px-5 py-8 text-sm text-gray-500">No orders have been recorded yet.</p>}
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h3 className="font-bold text-gray-950">Business directory</h3>
              <p className="text-xs text-gray-500">Recently registered businesses</p>
            </div>
            <Link href="/admin/shops" className="text-xs font-semibold text-brand-700 hover:underline">Manage</Link>
          </div>
          {recentShops.length ? (
            <div className="divide-y divide-gray-100">
              {recentShops.map((shop) => (
                <div key={shop.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{shop.name}</p>
                    <p className="mt-1 text-xs text-gray-500">{prettyStatus(shop.type)} · {shop.district || "Kigali"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${statusTone[shop.status] || "bg-gray-100 text-gray-700"}`}>{prettyStatus(shop.status)}</span>
                </div>
              ))}
            </div>
          ) : <p className="px-5 py-8 text-sm text-gray-500">No businesses have been registered yet.</p>}
          <div className="grid grid-cols-3 border-t border-gray-100 bg-gray-50 text-center">
            <div className="p-3"><p className="text-lg font-bold text-gray-900">{pendingShops}</p><p className="text-[10px] text-gray-500">Pending</p></div>
            <div className="border-x border-gray-200 p-3"><p className="text-lg font-bold text-gray-900">{approvedShops}</p><p className="text-[10px] text-gray-500">Approved</p></div>
            <div className="p-3"><p className="text-lg font-bold text-gray-900">{suspendedShops}</p><p className="text-[10px] text-gray-500">Suspended</p></div>
          </div>
        </section>
      </div>
    </div>
  );
}
