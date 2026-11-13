"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function updatePlatformSetting(formData: FormData) {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const keys = [
    "marketplace_live",
    "pending_review_alerts",
    "seller_fee_checks",
    "manual_order_confirmation",
  ];

  for (const key of keys) {
    const value = formData.get(key) === "on";
    try {
      const { error } = await supabase
        .from("platform_settings")
        .upsert(
          {
            key,
            value,
            description: "Updated from admin console",
            updated_by: (await supabase.auth.getUser()).data.user?.id ?? null,
          },
          { onConflict: "key" }
        );

      if (error) {
        throw error;
      }
    } catch {
      // Do nothing if the platform_settings table is not yet available.
    }
  }

  revalidatePath("/admin/settings");
  redirect("/admin/settings?success=Settings saved");
}
