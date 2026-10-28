import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, formatRWF } from "@/lib/format";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = Order & { shops: { name: string } | null; profiles: { full_name: string } | null };

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, shops(name), profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  const orders = (data as Row[]) ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">All orders</h1>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Date</th>
              <th className="th">Business</th>
              <th className="th">Customer</th>
              <th className="th">Type</th>
              <th className="th">Total</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.length === 0 && (
              <tr><td className="td text-gray-500" colSpan={6}>No orders yet.</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="td">{formatDate(o.created_at)}</td>
                <td className="td font-medium">{o.shops?.name ?? "—"}</td>
                <td className="td">{o.profiles?.full_name ?? "—"}</td>
                <td className="td capitalize">{o.fulfillment}</td>
                <td className="td">{formatRWF(o.total_rwf)}</td>
                <td className="td"><StatusBadge value={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
