"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function setShopStatus(formData: FormData) {
  await requireRole(["admin"]);
  const status = String(formData.get("status") ?? "");
  if (!["pending", "approved", "suspended"].includes(status)) return;
  const supabase = createClient();
  await supabase.from("shops").update({ status }).eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/admin", "layout");
}

export async function setUserRole(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!["buyer", "seller", "admin"].includes(role)) return;
  // Prevent an admin from removing their own admin access by mistake.
  if (id === admin.id) return;
  const supabase = createClient();
  await supabase.from("profiles").update({ role }).eq("id", id);
  revalidatePath("/admin/users");
}
