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
