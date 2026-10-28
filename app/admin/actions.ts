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

export async function sendPasswordReset(formData: FormData) {
  await requireRole(["admin"]);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || email.length > 254) {
    redirect("/admin/users?error=" + encodeURIComponent("Enter a valid account email address."));
  }

  const supabase = await createClient();
  // Always use the public production host, never a protected, deployment-specific preview URL.
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://tradebridge-kappa.vercel.app").replace(/\\/$/, "");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/update-password`,
  });

  if (error) {
    console.error("Admin-triggered password reset email failed", { message: error.message });
    redirect("/admin/users?error=" + encodeURIComponent("Could not send the reset email. Please wait before retrying and check Supabase Auth URL settings."));
  }
  redirect("/admin/users?success=" + encodeURIComponent("If this email belongs to a TradeBridge account, a secure password-reset email has been requested."));
}
