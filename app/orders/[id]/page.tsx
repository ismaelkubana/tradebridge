import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import ClearCart from "@/components/ClearCart";
import { cancelOrder, submitOrderPayment } from "../actions";
import { formatDate, formatRWF } from "@/lib/format";
import type { Order, OrderItem } from "@/lib/types";

export const dynamic = "force-dynamic";

type OrderPayment = { id: string; method: string; status: string; transaction_reference: string | null; created_at: string };

export default async function OrderDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string; payment_success?: string; payment_error?: string }>;
}) {
  const [routeParams, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const profile = await requireRole(["buyer"]);
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("*, shops(name, phone)").eq("id", routeParams.id).eq("buyer_id", profile.id).maybeSingle();
  const order = data as (Order & { shops: { name: string; phone: string } | null }) | null;
  if (!order) notFound();
  const [{ data: itemData }, { data: paymentData }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", order.id),
    supabase.from("order_payments").select("id,method,status,transaction_reference,created_at").eq("order_id", order.id).order("created_at", { ascending: false }),
  ]);
  const items = (itemData as OrderItem[] | null) ?? [];
  const payments = (paymentData as OrderPayment[] | null) ?? [];
  const hasPendingPayment = payments.some((p) => p.status === "pending");
  const hasPaidPayment = payments.some((p) => p.status === "paid");

  return <div className="mx-auto max-w-2xl space-y-4">
    {resolvedSearchParams.payment_error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{resolvedSearchParams.payment_error}</p>}
    {resolvedSearchParams.payment_success && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">Payment reference submitted for administrator verification.</p>}
    {resolvedSearchParams.placed && <><ClearCart /><div className="rounded-xl bg-green-50 p-4 text-sm text-green-800">✅ Your request was sent to <strong>{order.shops?.name}</strong>. They will confirm it shortly.</div></>}
    <div className="card">
      <div className="flex items-start justify-between gap-3"><div><h1 className="text-xl font-bold">{order.shops?.name}</h1><p className="text-sm text-gray-500">{formatDate(order.created_at)}</p></div><StatusBadge value={order.status} /></div>
      <ul className="mt-4 divide-y divide-gray-100 text-sm">{items.map((i) => <li key={i.id} className="flex justify-between py-2"><span>{i.qty} × {i.title}</span><span>{formatRWF(i.qty * i.price_rwf)}</span></li>)}</ul>
      <p className="mt-3 text-right font-bold">Total: {formatRWF(order.total_rwf)}</p>
      <dl className="mt-4 space-y-1 text-sm text-gray-600"><div><dt className="inline font-medium">Type: </dt><dd className="inline capitalize">{order.fulfillment}</dd></div>{order.address && <div><dt className="inline font-medium">Address: </dt><dd className="inline">{order.address}</dd></div>}{order.scheduled_at && <div><dt className="inline font-medium">Appointment: </dt><dd className="inline">{formatDate(order.scheduled_at)}</dd></div>}{order.note && <div><dt className="inline font-medium">Note: </dt><dd className="inline">{order.note}</dd></div>}{order.shops?.phone && <div><dt className="inline font-medium">Seller phone: </dt><dd className="inline">{order.shops.phone}</dd></div>}</dl>
      <div className="mt-5 border-t border-gray-100 pt-4"><h2 className="font-semibold">Payments</h2>
        {payments.length ? <ul className="mt-2 space-y-2 text-sm">{payments.map((p) => <li key={p.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-gray-50 p-3"><span>{p.method === "mtn_momo" ? "MTN MoMo" : p.method === "bank_transfer" ? "Bank transfer" : "Online payment"} · {p.transaction_reference || "Provider checkout"}</span><span className="font-medium capitalize">{p.status}</span></li>)}</ul> : <p className="mt-1 text-sm text-gray-500">No payment reference submitted yet.</p>}
        {!hasPaidPayment && !hasPendingPayment && order.total_rwf > 0 && order.status !== "cancelled" && <form action={submitOrderPayment} className="mt-4 space-y-3"><input type="hidden" name="order_id" value={order.id}/><p className="text-sm text-gray-600">Pay using the seller's verified instructions, then submit the transaction reference. This form does not charge you automatically.</p><div><label className="label" htmlFor="payment-method">Method</label><select className="input" id="payment-method" name="method" defaultValue="mtn_momo" required><option value="mtn_momo">MTN MoMo</option><option value="bank_transfer">Bank transfer</option></select></div><div><label className="label" htmlFor="payment-reference">Transaction reference</label><input className="input" id="payment-reference" name="transaction_reference" required maxLength={120} autoComplete="off"/></div><button className="btn" type="submit">Submit for verification</button><p className="text-xs text-gray-500">Online checkout can be activated after choosing a gateway and configuring its server-side credentials and payment-confirmation webhook. Never enter a MoMo PIN or bank password here.</p></form>}
      </div>
      {order.status === "new" && <form action={cancelOrder} className="mt-5"><input type="hidden" name="id" value={order.id}/><button type="submit" className="btn-danger">Cancel order</button></form>}
    </div>
    <Link href="/orders" className="text-sm text-brand-700 hover:underline">← All orders</Link>
  </div>;
}
