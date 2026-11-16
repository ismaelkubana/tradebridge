"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const BOOLEAN_SETTINGS = [
  { key: "marketplace_live", description: "Whether the public marketplace is available." },
  { key: "pending_review_alerts", description: "Show administrator attention notices for pending reviews." },
  { key: "seller_fee_checks", description: "Require verified seller registration payment before seller publishing privileges." },
  { key: "manual_order_confirmation", description: "Require manual review for order confirmation." },
] as const;

export async function savePlatformSettings(formData: FormData) {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const records = BOOLEAN_SETTINGS.map((setting) => ({
    key: setting.key,
    value: formData.get(setting.key) === "on",
    description: setting.description,
  }));

  const { error } = await supabase.from("platform_settings").upsert(records, { onConflict: "key" });
  if (error) {
    redirect("/admin/settings?error=" + encodeURIComponent("Settings could not be saved. Check database permissions and try again."));
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/settings?success=" + encodeURIComponent("Platform settings saved."));
}
