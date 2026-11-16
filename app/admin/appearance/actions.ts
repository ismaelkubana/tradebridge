"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const PRESETS = ["emerald", "ocean", "amber", "violet", "rose"] as const;
type Preset = typeof PRESETS[number];

export async function saveSiteTheme(formData: FormData) {
  await requireRole(["admin"]);
  const preset = String(formData.get("preset") || "") as Preset;
  if (!PRESETS.includes(preset)) {
    redirect("/admin/appearance?error=" + encodeURIComponent("Choose one of the available theme presets."));
  }
  const supabase = await createClient();
  const { error } = await supabase.from("platform_settings").upsert({
    key: "site_theme",
    value: { preset },
    description: "Public website brand color preset",
  }, { onConflict: "key" });
  if (error) redirect("/admin/appearance?error=" + encodeURIComponent("The theme could not be saved. Please try again."));
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  redirect("/admin/appearance?success=" + encodeURIComponent("Website theme saved and published."));
}
