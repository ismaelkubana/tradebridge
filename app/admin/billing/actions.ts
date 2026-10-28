"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function reviewRegistrationPayment(formData: FormData) {
  await requireRole(["admin"]);
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const note = String(formData.get("admin_note") ?? "").trim();

  if (!id || !["paid", "rejected"].includes(status)) {
    redirect("/admin/billing?error=" + encodeURIComponent("Invalid payment review request."));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seller_fee_payments")
    .update({ status, admin_note: note || null })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect("/admin/billing?error=" + encodeURIComponent("Could not update this payment. It may already have been reviewed."));
  }

  revalidatePath("/admin/billing");
  revalidatePath("/seller/billing");
  revalidatePath("/seller", "layout");
  redirect("/admin/billing?success=" + encodeURIComponent(status === "paid" ? "Payment verified; seller access is unlocked." : "Payment marked as rejected."));
}
