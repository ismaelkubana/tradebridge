import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRWF } from "@/lib/format";
import { reviewOrderPayment } from "./actions";

export const dynamic = "force-dynamic";

type Payment = {
  id: string; order_id: string; buyer_id: string; shop_id: string; amount_rwf: number;
  method: string; status: string; transaction_reference: string | null; provider_reference: string | null;
  admin_note: string | null; created_at: string;
  profiles: { full_name: string; phone: string } | null;
  shops: { name: string } | null;
};

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("order_payments")
    .select("*,profiles!order_payments_buyer_id_fkey(full_name,phone),shops(name)")
    .order("created_at", { ascending: false }).limit(300);
  const payments = (data as Payment[] | null) ?? [];
  return <div className="space-y-4">
    <div><h1 className="text-2xl font-bold">Order payments</h1><p className="mt-1 text-sm text-gray-600">Verify mobile-money and bank-transfer references against the actual provider or bank record. Never mark a payment paid from the submitted reference alone.</p></div>
    {params.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{params.error}</p>}
    {params.success && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{params.success}</p>}
    {payments.length === 0 ? <div className="card text-sm text-gray-500">No customer payment submissions yet. Online gateway payments remain unavailable until a provider integration is configured.</div> : <div className="space-y-3">{payments.map(p => <article className="card" key={p.id}>
      <div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{p.profiles?.full_name || "Customer"} <span className="font-normal text-gray-500">· {p.profiles?.phone || "No phone"}</span></p><p className="text-sm text-gray-600">{p.shops?.name || "Business"} · Order {p.order_id.slice(0, 8)}</p><p className="mt-1 text-sm">Method: <strong>{p.method === "mtn_momo" ? "MTN MoMo" : p.method === "bank_transfer" ? "Bank transfer" : "Online gateway"}</strong></p><p className="text-sm text-gray-600">Reference: {p.transaction_reference || p.provider_reference || "Not provided"}</p><p className="text-xs text-gray-500">Submitted {formatDate(p.created_at)}</p></div><div className="text-right"><p className="font-bold">{formatRWF(p.amount_rwf)}</p><p className="text-sm capitalize">{p.status}</p></div></div>
      {p.admin_note && <p className="mt-2 text-sm text-gray-600">Note: {p.admin_note}</p>}
      {p.status === "pending" && <form action={reviewOrderPayment} className="mt-4 space-y-3 border-t border-gray-100 pt-3"><input type="hidden" name="id" value={p.id}/><label className="label" htmlFor={"note-"+p.id}>Admin note (optional)</label><input className="input" id={"note-"+p.id} name="admin_note" maxLength={500} placeholder="Verified against provider/bank statement"/><div className="flex gap-2"><button className="btn" type="submit" name="status" value="paid">Verify payment</button><button className="btn-danger" type="submit" name="status" value="rejected">Reject</button></div></form>}
    </article>)}</div>}
  </div>;
}
