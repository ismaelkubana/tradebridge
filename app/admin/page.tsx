import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatRWF } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const count = async (table: string, filter?: [string, string]) => {
    let q = supabase.from(table).select("id", { count: "exact", head: true });
    if (filter) q = q.eq(filter[0], filter[1]);
    const { count: c } = await q;
    return c ?? 0;
  };

  const [users, sellers, pendingShops, approvedShops, orders, { data: done }] = await Promise.all([
    count("profiles"),
    count("profiles", ["role", "seller"]),
    count("shops", ["status", "pending"]),
    count("shops", ["status", "approved"]),
    count("orders"),
    supabase.from("orders").select("total_rwf").eq("status", "completed"),
  ]);

  const volume = (done ?? []).reduce((s, o) => s + o.total_rwf, 0);

  const stats = [
    { label: "Users", value: String(users) },
    { label: "Sellers", value: String(sellers) },
    { label: "Live businesses", value: String(approvedShops) },
    { label: "Orders", value: String(orders) },
    { label: "Completed sales volume", value: formatRWF(volume) },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {pendingShops > 0 && (
        <Link
          href="/admin/shops?status=pending"
          className="block rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          ⏳ {pendingShops} business{pendingShops === 1 ? "" : "es"} waiting for approval. Review now →
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-xs uppercase tracking-wide text-gray-500">{s.label}</p>
            <p className="mt-1 text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
