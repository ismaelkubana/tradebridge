"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function submitListingFeedback(formData: FormData) {
  const profile = await requireRole(["buyer"]);
  const listingId = String(formData.get("listing_id") ?? "").trim();
  const shopId = String(formData.get("shop_id") ?? "").trim();
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 500);
  const fileValue = formData.get("photo");
  const photo = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(listingId) || !uuidPattern.test(shopId)) {
    redirect("/browse?feedback_error=" + encodeURIComponent("Please open the product page again and retry."));
  }
  if (photo && (photo.size > 3 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(photo.type))) {
    redirect("/shops/" + shopId + "?feedback_error=" + encodeURIComponent("Choose a JPG, PNG, or WebP image smaller than 3 MB."));
  }

  const supabase = await createClient();
  const { data: listing } = await supabase.from("listings").select("id,shop_id").eq("id", listingId).eq("shop_id", shopId).eq("active", true).maybeSingle();
  if (!listing) redirect("/shops/" + shopId + "?feedback_error=" + encodeURIComponent("This product is no longer available for feedback."));

  let imageUrl: string | undefined;
  if (photo) {
    const extension = photo.type === "image/jpeg" ? "jpg" : photo.type === "image/png" ? "png" : "webp";
    const objectPath = `${profile.id}/${listingId}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("listing-feedback").upload(objectPath, new Uint8Array(await photo.arrayBuffer()), {
      contentType: photo.type,
      upsert: false,
    });
    if (uploadError) {
      console.error("Listing feedback photo upload failed", { code: uploadError.name, message: uploadError.message });
      redirect("/shops/" + shopId + "?feedback_error=" + encodeURIComponent("The photo could not be uploaded. You can still submit a thumbs-up without a photo."));
    }
    imageUrl = supabase.storage.from("listing-feedback").getPublicUrl(objectPath).data.publicUrl;
  }

  const { data: existing } = await supabase.from("listing_feedback").select("image_url").eq("listing_id", listingId).eq("buyer_id", profile.id).maybeSingle();
  const { error } = await supabase.from("listing_feedback").upsert({
    listing_id: listingId,
    buyer_id: profile.id,
    liked: true,
    comment,
    image_url: imageUrl ?? existing?.image_url ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "listing_id,buyer_id" });
  if (error) {
    console.error("Listing feedback save failed", { code: error.code, message: error.message });
    redirect("/shops/" + shopId + "?feedback_error=" + encodeURIComponent("Your feedback could not be saved. Please try again."));
  }

  revalidatePath("/shops/" + shopId);
  redirect("/shops/" + shopId + "?feedback_success=1");
}
