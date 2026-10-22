"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Buyers can cancel an order only while it is still "new" (enforced by the database rules too).
export async function cancelOrder(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();
  await supabase.from("orders").update({ status: "cancelled" }).eq("id", id).eq("status", "new");
  revalidatePath(`/orders/${id}`);
  revalidatePath("/orders");
}
