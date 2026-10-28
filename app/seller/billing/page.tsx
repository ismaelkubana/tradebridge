import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRWF } from "@/lib/format";
import { submitRegistrationPayment } from "../actions";

export const dynamic = "force-dynamic";

export default async function SellerBillingPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const profile = await requireRole(["seller"]);
  const supabase = createClient();

  const [{ data: billing }, { data: payments }, { data: commissions }] = await Promise.all([
    supabase.from("seller_billing").select("*").eq("seller_id", profile.id).maybeSingle(),
    supabase.from("seller_fee_payments").select("*").eq("seller_id", profile.id).order("submitted_at", { ascending: false }),
    supabase.from("seller_commissions").select("commission_amount_rwf,status").eq("seller_id", profile.id),
  ]);

  const paid = Boolean(billing?.registration_paid_at);
  const trialEnd = billing?.trial_ends_at ? new Date(billing.trial_ends_at) : null;
  const trialActive = Boolean(trialEnd && trialEnd.getTime() > Date.now());
  const pending = (payments ?? []).some((p) => p.status === "pending");
  const outstandingCommission = (commissions ?? [])
    .filter((c) => c.status === "due")
    .reduce((sum, c) => sum + c.commission_amount_rwf, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Seller billing</h1>
        <p className="mt-1 text-sm text-gray-600">Your registration trial, fee status, and sales commission.</p>
      </div>

      {searchParams.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>}
      {searchParams.success && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{searchParams.success}</p>}

      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Registration fee</p>
        <p className="mt-2 text-3xl font-bold">{formatRWF(5000)}</p>
        <p className="mt-2 text-sm text-gray-600">
          {paid
            ? "Your registration fee has been verified. Your selling access is unlocked."
            : trialActive
              ? `Your 14-day free trial is active until ${trialEnd ? formatDate(trialEnd.toISOString()) : "the trial end date"}.`
              : pending
                ? "Your trial has ended or is ending, and your payment is awaiting administrator verification."
                : "Your free trial has ended. Submit your registration payment reference to request verification."}
        </p>
        {!paid && !trialActive && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            New listings and new customer orders are blocked until the RWF 5,000 payment is verified. Your account and existing records remain available.
          </div>
        )}
        {!paid && (
          <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
            <strong>Before paying:</strong> use only the official payment instructions provided by TradeBridge. Do not send your PIN or banking password. The transaction reference you submit will be reviewed by an administrator.
          </div>
        )}
      </div>

      {!paid && (
        <div className="card">
          <h2 className="text-lg font-semibold">Submit registration payment</h2>
          <p className="mt-1 text-sm text-gray-600">Enter the reference from a payment you have already made. This form does not itself charge your account.</p>
          <form action={submitRegistrationPayment} className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="method">Payment method</label>
              <select id="method" name="method" className="input" required defaultValue="mtn_momo">
                <option value="mtn_momo">MTN Rwanda MoMo</option>
                <option value="equity_bank">Equity Bank transfer</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="transaction_reference">Transaction reference</label>
              <input id="transaction_reference" name="transaction_reference" className="input" required maxLength={120} autoComplete="off" />
            </div>
            <button className="btn" type="submit" disabled={pending}>
              {pending ? "Payment awaiting review" : "Submit for verification"}
            </button>
          </form>
          <p className="mt-3 text-xs text-gray-500">If you have not received official destination details yet, contact TradeBridge support before making a transfer.</p>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold">Sales commission</h2>
        <p className="mt-1 text-sm text-gray-600">TradeBridge tracks a 5% commission on completed orders. Because customers pay sellers directly, this is recorded as commission owed; it is not automatically deducted from the buyer's payment.</p>
        <p className="mt-3 text-xl font-bold">{formatRWF(outstandingCommission)} <span className="text-sm font-normal text-gray-500">outstanding</span></p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">Registration payment history</h2>
        {(payments ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No registration payments submitted yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {(payments ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <span>{p.method === "mtn_momo" ? "MTN MoMo" : "Equity Bank"} · {p.transaction_reference}</span>
                <span className="font-medium capitalize">{p.status} · {formatRWF(p.amount_rwf)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link href="/seller" className="btn-outline inline-block">Back to seller dashboard</Link>
    </div>
  );
}
