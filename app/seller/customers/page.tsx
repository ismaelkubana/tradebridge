import { requireRole, getMyShop } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRWF } from "@/lib/format";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type CustomerRow = {
  buyer_id: string;
  total_rwf: number;
  created_at: string;
  contact_phone: string;
  profiles: { full_name: string; phone: string } | null;
};

export default async function SellerCustomersPage() {
  const profile = await requireRole(["seller"]);
  const shop = await getMyShop(profile.id);
  if (!shop) redirect("/seller/shop");
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("buyer_id,total_rwf,created_at,contact_phone,profiles(full_name,phone)")
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false });
  const orders = (data as CustomerRow[] | null) ?? [];
  const customers = new Map<string, { name: string; phone: string; orders: number; spent: number; lastOrder: string }>();
  for (const order of orders) {
    const previous = customers.get(order.buyer_id);
    if (previous) {
      previous.orders += 1;
      previous.spent += order.total_rwf;
    } else {
      customers.set(order.buyer_id, {
        name: order.profiles?.full_name || "TradeBridge customer",
        phone: order.profiles?.phone || order.contact_phone || "No phone saved",
        orders: 1,
        spent: order.total_rwf,
        lastOrder: order.created_at,
      });
    }
  }
  const rows = [...customers.entries()];
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="mt-1 text-sm text-gray-600">Customers who have placed an order with {shop.name}. Contact details are limited to your own business orders.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card"><p className="text-xs uppercase text-gray-500">Customers</p><p className="mt-1 text-2xl font-bold">{rows.length}</p></div>
        <div className="card"><p className="text-xs uppercase text-gray-500">Orders</p><p className="mt-1 text-2xl font-bold">{orders.length}</p></div>
        <div className="card"><p className="text-xs uppercase text-gray-500">Order value</p><p className="mt-1 text-2xl font-bold">{formatRWF(orders.reduce((sum, o) => sum + o.total_rwf, 0))}</p></div>
      </div>
      {rows.length === 0 ? <div className="card text-sm text-gray-500">Customer records will appear here after someone places an order with your business.</div> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr><th className="th">Customer</th><th className="th">Phone</th><th className="th">Orders</th><th className="th">Total order value</th><th className="th">Latest order</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{rows.map(([id, c]) => <tr key={id}><td className="td font-medium">{c.name}</td><td className="td">{c.phone}</td><td className="td">{c.orders}</td><td className="td">{formatRWF(c.spent)}</td><td className="td">{formatDate(c.lastOrder)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
