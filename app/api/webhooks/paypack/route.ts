import { createHmac, timingSafeEqual } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type PaypackEvent = {
  kind?: string;
  session_id?: string;
  data?: {
    session_id?: string;
    sessionId?: string;
    id?: string;
    ref?: string;
    status?: string;
    amount?: number | string;
  };
};

export async function HEAD() {
  return new Response(null, { status: 200 });
}

export async function POST(request: Request) {
  const secret = process.env.PAYPACK_WEBHOOK_SIGN_KEY;
  if (!secret) return Response.json({ error: "Webhook is not configured" }, { status: 503 });

  const rawBody = await request.text();
  const suppliedSignature = request.headers.get("x-paypack-signature") ?? "";
  if (!suppliedSignature) return Response.json({ error: "Missing signature" }, { status: 401 });
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  let received: Buffer;
  try { received = Buffer.from(suppliedSignature, "base64"); } catch {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: PaypackEvent;
  try { event = JSON.parse(rawBody) as PaypackEvent; } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (event.kind !== "session:processed") return Response.json({ received: true, ignored: true });
  const data = event.data;
  const sessionId = data?.session_id ?? data?.sessionId ?? data?.id ?? data?.ref ?? event.session_id;
  if (!sessionId || data?.amount === undefined || !data.status) {
    return Response.json({ error: "Session reference, amount, or status is missing; payment was not changed" }, { status: 422 });
  }
  const amount = Number(data.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return Response.json({ error: "Invalid amount" }, { status: 422 });
  }

  const status = ["successful", "success", "paid", "completed"].includes(data.status.toLowerCase())
    ? "paid"
    : ["failed", "failure", "cancelled", "canceled"].includes(data.status.toLowerCase())
      ? "rejected"
      : null;
  if (!status) return Response.json({ received: true, ignored: true, reason: "Unrecognized provider status" });

  try {
    const supabase = createServiceRoleClient();
    const { data: payment, error: lookupError } = await supabase
      .from("order_payments")
      .select("id,amount_rwf,status")
      .eq("method", "online_gateway")
      .eq("provider_reference", sessionId)
      .maybeSingle();
    if (lookupError) return Response.json({ error: "Could not look up checkout session" }, { status: 500 });
    if (!payment) return Response.json({ received: true, ignored: true, reason: "Unknown checkout session" });
    if (payment.status !== "pending") return Response.json({ received: true, duplicate: true });
    if (payment.amount_rwf !== amount) return Response.json({ error: "Provider amount does not match order amount" }, { status: 422 });

    const { error: updateError } = await supabase.from("order_payments").update({
      status,
      verified_at: new Date().toISOString(),
      admin_note: status === "paid" ? "Confirmed by signed Paypack webhook." : "Paypack reported unsuccessful checkout.",
    }).eq("id", payment.id).eq("status", "pending");
    if (updateError) return Response.json({ error: "Could not update payment record" }, { status: 500 });
    return Response.json({ received: true, updated: status });
  } catch {
    return Response.json({ error: "Payment webhook could not be processed" }, { status: 500 });
  }
}
