import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, formatRWF } from "@/lib/format";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  const profile = await requireRole(["buyer", "seller", "admin"]);
  const supabase = createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, shops(name)")
    .eq("buyer_id", profile.id)
    .order("created_at", { ascending: false });
  const orders = (data as (Order & { shops: { name: string } | null })[]) ?? [];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">My orders</h1>
      {orders.length === 0 ? (
        <div className="card text-center">
          <p className="text-gray-600">You have not placed any orders yet.</p>
          <Link href="/browse" className="btn mt-4">Browse businesses</Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Business</th>
                <th className="th">Date</th>
                <th className="th">Type</th>
                <th className="th">Total</th>
                <th className="th">Status</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="td font-medium">{o.shops?.name ?? "—"}</td>
                  <td className="td">{formatDate(o.created_at)}</td>
                  <td className="td capitalize">{o.fulfillment}</td>
                  <td className="td">{formatRWF(o.total_rwf)}</td>
                  <td className="td"><StatusBadge value={o.status} /></td>
                  <td className="td"><Link className="text-brand-700 hover:underline" href={`/orders/${o.id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
