"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function reviewRegistrationPayment(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const note = String(formData.get("admin_note") ?? "").trim().slice(0, 500);

  if (!id || !["paid", "rejected"].includes(status)) {
    redirect("/admin/billing?error=" + encodeURIComponent("Invalid payment review request."));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seller_fee_payments")
    .update({ status, admin_note: note || null })
    .eq("id", id)
    .eq("status", "pending")
    .select("id,seller_id")
    .maybeSingle();

  if (error || !data) {
    redirect("/admin/billing?error=" + encodeURIComponent("Could not update this payment. It may already have been reviewed."));
  }

  if (status === "paid") {
    // Only unlock selling after a human has verified the transfer against the provider/bank.
    const { error: billingError } = await supabase
      .from("seller_billing")
      .update({ registration_paid_at: new Date().toISOString() })
      .eq("seller_id", data.seller_id);
    if (billingError) {
      console.error("Registration payment verified but billing update failed", { paymentId: id, sellerId: data.seller_id, adminId: admin.id, error: billingError.message });
      redirect("/admin/billing?error=" + encodeURIComponent("Payment status was saved, but seller access could not be updated. Please retry the billing update or contact support."));
    }
  }

  revalidatePath("/admin/billing");
  revalidatePath("/seller/billing");
  revalidatePath("/seller", "layout");
  revalidatePath("/seller/listings");
  revalidatePath("/browse");
  redirect("/admin/billing?success=" + encodeURIComponent(status === "paid" ? "Payment verified; seller access is unlocked." : "Payment marked as rejected."));
}
