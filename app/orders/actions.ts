"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";

// Buyers can cancel an order only while it is still "new" (enforced by the database rules too).
export async function cancelOrder(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("orders").update({ status: "cancelled" }).eq("id", id).eq("status", "new");
  revalidatePath(`/orders/${id}`);
  revalidatePath("/orders");
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function submitOrderPayment(formData: FormData) {
  const profile = await requireRole(["buyer"]);
  const id = text(formData, "order_id");
  const method = text(formData, "method");
  const reference = text(formData, "transaction_reference");
  if (!id || !["mtn_momo", "bank_transfer"].includes(method) || !reference || reference.length > 120) {
    redirect("/orders/" + encodeURIComponent(id) + "?payment_error=" + encodeURIComponent("Choose a manual payment method and enter the transaction reference."));
  }
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("id,buyer_id,shop_id,total_rwf,status").eq("id", id).eq("buyer_id", profile.id).maybeSingle();
  if (!order || order.status === "cancelled" || order.total_rwf <= 0) {
    redirect("/orders/" + encodeURIComponent(id) + "?payment_error=" + encodeURIComponent("This order cannot accept a payment submission."));
  }
  const { error } = await supabase.from("order_payments").insert({ order_id: order.id, buyer_id: profile.id, shop_id: order.shop_id, amount_rwf: order.total_rwf, method, transaction_reference: reference, status: "pending" });
  if (error) redirect("/orders/" + encodeURIComponent(id) + "?payment_error=" + encodeURIComponent("Payment reference could not be submitted. It may already be recorded; refresh and check payment history."));
  revalidatePath("/orders/" + id);
  revalidatePath("/admin/payments");
  revalidatePath("/seller/orders");
  redirect("/orders/" + id + "?payment_success=1");
}


export async function startOnlinePayment(formData: FormData) {
  const profile = await requireRole(["buyer"]);
  const orderId = text(formData, "order_id");
  const appId = process.env.PAYPACK_CHECKOUT_APP_ID;
  const webhookSecret = process.env.PAYPACK_WEBHOOK_SIGN_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!appId || !webhookSecret || !serviceRoleKey) {
    redirect("/orders/" + encodeURIComponent(orderId) + "?payment_error=" + encodeURIComponent("Online checkout is not configured yet. Use manual payment or contact TradeBridge support."));
  }

  const supabase = await createClient();
  const [{ data: order }, { data: authData }] = await Promise.all([
    supabase.from("orders").select("id,buyer_id,shop_id,total_rwf,status").eq("id", orderId).eq("buyer_id", profile.id).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (!order || order.status === "cancelled" || order.total_rwf <= 0) {
    redirect("/orders/" + encodeURIComponent(orderId) + "?payment_error=" + encodeURIComponent("This order cannot be paid online."));
  }
  const email = authData.user?.email;
  if (!email) redirect("/orders/" + encodeURIComponent(orderId) + "?payment_error=" + encodeURIComponent("Your account needs a verified email address to start online checkout."));

  const { data: existingPayments } = await supabase.from("order_payments").select("id,status").eq("order_id", order.id);
  if ((existingPayments ?? []).some((payment) => payment.status === "paid")) {
    redirect("/orders/" + encodeURIComponent(orderId) + "?payment_error=" + encodeURIComponent("This order already has a verified payment."));
  }
  if ((existingPayments ?? []).some((payment) => payment.status === "pending")) {
    redirect("/orders/" + encodeURIComponent(orderId) + "?payment_error=" + encodeURIComponent("A payment is already awaiting verification. Check payment history before starting another."));
  }

  const { data: items } = await supabase.from("order_items").select("title,price_rwf,qty").eq("order_id", order.id);
  if (!items?.length || items.reduce((sum, item) => sum + item.price_rwf * item.qty, 0) !== order.total_rwf) {
    redirect("/orders/" + encodeURIComponent(orderId) + "?payment_error=" + encodeURIComponent("The order total could not be verified. Contact TradeBridge support before paying."));
  }

  let response: Response;
  try {
    response = await fetch("https://checkout.paypack.rw/api/checkouts/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        app_id: appId,
        email,
        items: items.map((item) => ({ name: item.title.slice(0, 120), price: item.price_rwf, quantity: item.qty })),
      }),
      cache: "no-store",
    });
  } catch {
    redirect("/orders/" + encodeURIComponent(orderId) + "?payment_error=" + encodeURIComponent("Paypack could not be reached. Please try again later."));
  }
  if (!response.ok) redirect("/orders/" + encodeURIComponent(orderId) + "?payment_error=" + encodeURIComponent("Paypack could not start checkout. Please try again later."));
  const session = await response.json() as { session_id?: string; amount?: number; payment_link?: string };
  if (!session.session_id || !session.payment_link || Number(session.amount) !== order.total_rwf) {
    redirect("/orders/" + encodeURIComponent(orderId) + "?payment_error=" + encodeURIComponent("The checkout amount could not be verified. No payment was recorded."));
  }
  let paymentUrl: URL;
  try { paymentUrl = new URL(session.payment_link); } catch {
    redirect("/orders/" + encodeURIComponent(orderId) + "?payment_error=" + encodeURIComponent("The payment provider returned an invalid checkout link."));
  }
  if (paymentUrl.protocol !== "https:" || !(paymentUrl.hostname === "checkout.paypack.rw" || paymentUrl.hostname.endsWith(".paypack.rw") || paymentUrl.hostname === "paypack-checkout.fly.dev")) {
    redirect("/orders/" + encodeURIComponent(orderId) + "?payment_error=" + encodeURIComponent("The payment provider returned an untrusted checkout link."));
  }
  const { error } = await supabase.from("order_payments").insert({
    order_id: order.id,
    buyer_id: profile.id,
    shop_id: order.shop_id,
    amount_rwf: order.total_rwf,
    method: "online_gateway",
    status: "pending",
    provider_reference: session.session_id,
  });
  if (error) redirect("/orders/" + encodeURIComponent(orderId) + "?payment_error=" + encodeURIComponent("Could not save the checkout session. Contact TradeBridge support before trying again."));
  redirect(paymentUrl.toString());
}
