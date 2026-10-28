import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import ClearCart from "@/components/ClearCart";
import { cancelOrder } from "../actions";
import { formatDate, formatRWF } from "@/lib/format";
import type { Order, OrderItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { placed?: string };
}) {
  const profile = await requireRole(["buyer", "seller", "admin"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select("*, shops(name, phone)")
    .eq("id", params.id)
    .eq("buyer_id", profile.id)
    .maybeSingle();
  const order = data as (Order & { shops: { name: string; phone: string } | null }) | null;
  if (!order) notFound();

  const { data: itemData } = await supabase.from("order_items").select("*").eq("order_id", order.id);
  const items = (itemData as OrderItem[]) ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {searchParams.placed && (
        <>
          <ClearCart />
          <div className="rounded-xl bg-green-50 p-4 text-sm text-green-800">
            ✅ Your request was sent to <strong>{order.shops?.name}</strong>. They will confirm it shortly.
          </div>
        </>
      )}

      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{order.shops?.name}</h1>
            <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
          </div>
          <StatusBadge value={order.status} />
        </div>

        <ul className="mt-4 divide-y divide-gray-100 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between py-2">
              <span>{i.qty} × {i.title}</span>
              <span>{formatRWF(i.qty * i.price_rwf)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-right font-bold">Total: {formatRWF(order.total_rwf)}</p>

        <dl className="mt-4 space-y-1 text-sm text-gray-600">
          <div><dt className="inline font-medium">Type: </dt><dd className="inline capitalize">{order.fulfillment}</dd></div>
          {order.address && <div><dt className="inline font-medium">Address: </dt><dd className="inline">{order.address}</dd></div>}
          {order.scheduled_at && <div><dt className="inline font-medium">Appointment: </dt><dd className="inline">{formatDate(order.scheduled_at)}</dd></div>}
          {order.note && <div><dt className="inline font-medium">Note: </dt><dd className="inline">{order.note}</dd></div>}
          {order.shops?.phone && <div><dt className="inline font-medium">Seller phone: </dt><dd className="inline">{order.shops.phone}</dd></div>}
        </dl>

        {order.status === "new" && (
          <form action={cancelOrder} className="mt-5">
            <input type="hidden" name="id" value={order.id} />
            <button type="submit" className="btn-danger">Cancel order</button>
          </form>
        )}
      </div>

      <Link href="/orders" className="text-sm text-brand-700 hover:underline">← All orders</Link>
    </div>
  );
}
