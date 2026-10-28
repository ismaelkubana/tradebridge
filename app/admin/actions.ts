"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function setShopStatus(formData: FormData) {
  await requireRole(["admin"]);
  const status = String(formData.get("status") ?? "");
  if (!["pending", "approved", "suspended"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("shops").update({ status }).eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/admin", "layout");
}

export async function setUserRole(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!["buyer", "seller", "admin"].includes(role)) return;
  if (id === admin.id) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", id);
  revalidatePath("/admin/users");
}

export async function reviewOrderPayment(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("admin_note") ?? "").trim().slice(0, 500);
  if (!id || !["paid", "rejected"].includes(status)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("order_payments").update({ status, admin_note: note || null, verified_by: admin.id, verified_at: new Date().toISOString() }).eq("id", id).eq("status", "pending");
  if (error) redirect("/admin/payments?error=" + encodeURIComponent("Could not update payment. Confirm the order_payments migration is applied."));
  revalidatePath("/admin/payments");
  revalidatePath("/orders");
  revalidatePath("/seller/orders");
  redirect("/admin/payments?success=" + encodeURIComponent(status === "paid" ? "Payment verified." : "Payment rejected."));
}
