import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRWF } from "@/lib/format";
import { reviewRegistrationPayment } from "./actions";

export const dynamic = "force-dynamic";

type RegistrationPayment = {
  id: string;
  seller_id: string;
  amount_rwf: number;
  method: string;
  transaction_reference: string;
  status: string;
  submitted_at: string;
  admin_note: string | null;
  profiles: { full_name: string; phone: string } | null;
};

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seller_fee_payments")
    .select("*, profiles!seller_fee_payments_seller_id_fkey(full_name,phone)")
    .order("submitted_at", { ascending: false });

  const payments = (data as RegistrationPayment[] | null) ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Seller registration payments</h1>
        <p className="mt-1 text-sm text-gray-600">Review RWF 5,000 registration-fee submissions. Verify the payment with the provider or bank before approving.</p>
      </div>
      {searchParams.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>}
      {searchParams.success && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{searchParams.success}</p>}

      {payments.length === 0 ? (
        <div className="card text-sm text-gray-500">No seller registration payments have been submitted.</div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <article key={p.id} className="card">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.profiles?.full_name || "Seller"} <span className="font-normal text-gray-500">· {p.profiles?.phone || "No phone saved"}</span></p>
                  <p className="mt-1 text-sm text-gray-600">{p.method === "mtn_momo" ? "MTN Rwanda MoMo" : "Equity Bank"} · Reference: <strong>{p.transaction_reference}</strong></p>
                  <p className="mt-1 text-xs text-gray-500">Submitted {formatDate(p.submitted_at)} · Seller ID {p.seller_id}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatRWF(p.amount_rwf)}</p>
                  <p className="text-sm capitalize text-gray-600">{p.status}</p>
                </div>
              </div>
              {p.admin_note && <p className="mt-2 text-sm text-gray-600">Note: {p.admin_note}</p>}
              {p.status === "pending" && (
                <form action={reviewRegistrationPayment} className="mt-4 space-y-3 border-t border-gray-100 pt-3">
                  <input type="hidden" name="id" value={p.id} />
                  <div>
                    <label className="label" htmlFor={`note-${p.id}`}>Admin note (optional)</label>
                    <input id={`note-${p.id}`} name="admin_note" maxLength={500} className="input" placeholder="e.g. verified against provider statement" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn" name="status" value="paid" type="submit">Verify payment</button>
                    <button className="btn-danger" name="status" value="rejected" type="submit">Reject payment</button>
                  </div>
                </form>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
