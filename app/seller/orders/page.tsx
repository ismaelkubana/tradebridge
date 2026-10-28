import { redirect } from "next/navigation";
import { requireRole, getMyShop } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateOrderStatus } from "../actions";
import StatusBadge from "@/components/StatusBadge";
import { formatDate, formatRWF, statusLabel } from "@/lib/format";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: OrderStatus[] = ["new", "confirmed", "preparing", "out_for_delivery", "ready", "completed", "cancelled"];

type OrderRow = Order & { profiles: { full_name: string } | null; order_items: OrderItem[] };

export default async function SellerOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const profile = await requireRole(["seller"]);
  const shop = await getMyShop(profile.id);
  if (!shop) redirect("/seller/shop");

  const filter = STATUSES.includes(resolvedSearchParams.status as OrderStatus) ? resolvedSearchParams.status : undefined;

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("*, profiles(full_name), order_items(*)")
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false });
  if (filter) query = query.eq("status", filter);
  const { data } = await query;
  const orders = (data as OrderRow[]) ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders & bookings</h1>

      <div className="flex flex-wrap gap-2 text-sm">
        <a href="/seller/orders" className={`rounded-full px-3 py-1 ${!filter ? "bg-brand-600 text-white" : "bg-white ring-1 ring-gray-300"}`}>All</a>
        {STATUSES.map((s) => (
          <a key={s} href={`/seller/orders?status=${s}`} className={`rounded-full px-3 py-1 ${filter === s ? "bg-brand-600 text-white" : "bg-white ring-1 ring-gray-300"}`}>
            {statusLabel(s)}
          </a>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-gray-500">No orders here yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{o.profiles?.full_name || "Customer"}</p>
                  <p className="text-sm text-gray-500">{formatDate(o.created_at)} · <span className="capitalize">{o.fulfillment}</span></p>
                  <p className="text-sm text-gray-600">📞 {o.contact_phone}</p>
                  {o.address && <p className="text-sm text-gray-600">📍 {o.address}</p>}
                  {o.scheduled_at && <p className="text-sm text-gray-600">🗓️ {formatDate(o.scheduled_at)}</p>}
                  {o.note && <p className="text-sm italic text-gray-600">“{o.note}”</p>}
                </div>
                <div className="text-right">
                  <StatusBadge value={o.status} />
                  <p className="mt-1 font-bold">{formatRWF(o.total_rwf)}</p>
                </div>
              </div>

              <ul className="mt-3 divide-y divide-gray-100 border-t border-gray-100 text-sm">
                {o.order_items.map((i) => (
                  <li key={i.id} className="flex justify-between py-1.5">
                    <span>{i.qty} × {i.title}</span>
                    <span>{formatRWF(i.qty * i.price_rwf)}</span>
                  </li>
                ))}
              </ul>

              <form action={updateOrderStatus} className="mt-3 flex items-center gap-2">
                <input type="hidden" name="id" value={o.id} />
                <select name="status" defaultValue={o.status} className="input !w-auto">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{statusLabel(s)}</option>
                  ))}
                </select>
                <button type="submit" className="btn btn-sm">Update status</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
