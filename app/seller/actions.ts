"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyShop, requireRole } from "@/lib/auth";
import { KIGALI_DISTRICTS } from "@/lib/types";

const SHOP_TYPES = ["shop", "restaurant", "salon"];
const ORDER_STATUSES = ["new", "confirmed", "preparing", "out_for_delivery", "ready", "completed", "cancelled"];
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function saveShop(formData: FormData) {
  const profile = await requireRole(["seller"]);
  const supabase = await createClient();
  const existing = await getMyShop(profile.id);
  const name = text(formData, "name");
  const type = text(formData, "type");
  const district = text(formData, "district");
  if (!name) redirect("/seller/shop?error=" + encodeURIComponent("Business name is required"));
  if (!SHOP_TYPES.includes(type)) redirect("/seller/shop?error=" + encodeURIComponent("Choose a business type"));
  const fields = { name, type, description: text(formData, "description"), district: KIGALI_DISTRICTS.includes(district) ? district : "", address: text(formData, "address"), phone: text(formData, "phone") };
  if (existing) {
    const { error } = await supabase.from("shops").update(fields).eq("id", existing.id);
    if (error) redirect("/seller/shop?error=" + encodeURIComponent(error.message));
  } else {
    const { error } = await supabase.from("shops").insert({ ...fields, owner_id: profile.id });
    if (error) redirect("/seller/shop?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/seller", "layout");
  redirect("/seller");
}

export async function saveListing(formData: FormData) {
  const profile = await requireRole(["seller"]);
  const shop = await getMyShop(profile.id);
  if (!shop) redirect("/seller/shop");
  const supabase = await createClient();
  const { data: billing } = await supabase.from("seller_billing").select("trial_started_at,trial_ends_at,registration_paid_at").eq("seller_id", profile.id).maybeSingle();
  if (!billing || (!billing.registration_paid_at && (!billing.trial_ends_at || new Date(billing.trial_ends_at).getTime() <= Date.now()))) {
    redirect("/seller/billing?error=" + encodeURIComponent("Your free trial has ended. Pay the RWF 5,000 registration fee to add or update listings."));
  }

  const id = text(formData, "id");
  const title = text(formData, "title");
  const price = Math.round(Number(text(formData, "price_rwf")));
  if (!title || !Number.isFinite(price) || price < 0) redirect("/seller/listings?error=" + encodeURIComponent("Title and a valid price are required"));

  const stockRaw = text(formData, "stock");
  const durationRaw = text(formData, "duration_min");
  let imageUrl = text(formData, "existing_image_url") || null;
  let generatedListingId: string | null = null;
  const file = formData.get("image");

  if (file instanceof File && file.size > 0) {
    if (!IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES) {
      redirect("/seller/listings?error=" + encodeURIComponent("Choose a JPG, PNG or WebP image no larger than 3 MB."));
    }
    const listingId = id || crypto.randomUUID();
    if (!id) generatedListingId = listingId;
    const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
    const path = `${shop.id}/${listingId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("listing-images").upload(path, file, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600",
    });
    if (uploadError) redirect("/seller/listings?error=" + encodeURIComponent("Photo upload failed. Please try again or contact support."));
    imageUrl = supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl;
  }

  const fields = {
    title,
    description: text(formData, "description"),
    price_rwf: price,
    stock: shop.type === "shop" && stockRaw !== "" ? Math.max(0, Math.round(Number(stockRaw))) : null,
    duration_min: shop.type === "salon" && durationRaw !== "" ? Math.max(1, Math.round(Number(durationRaw))) : null,
    image_url: imageUrl,
  };

  if (id) {
    const { error } = await supabase.from("listings").update(fields).eq("id", id).eq("shop_id", shop.id);
    if (error) redirect("/seller/listings?error=" + encodeURIComponent("Could not save this listing. Please check the details and try again."));
  } else {
    const { error } = await supabase.from("listings").insert({ ...fields, ...(generatedListingId ? { id: generatedListingId } : {}), shop_id: shop.id });
    if (error) redirect("/seller/listings?error=" + encodeURIComponent("Could not publish this listing. Please check the details and try again."));
  }

  revalidatePath("/seller/listings");
  revalidatePath("/browse");
  revalidatePath("/");
  redirect("/seller/listings");
}

export async function toggleListing(formData: FormData) {
  const profile = await requireRole(["seller"]);
  const shop = await getMyShop(profile.id);
  if (!shop) return;
  const supabase = await createClient();
  const id = text(formData, "id");
  const active = text(formData, "active") === "true";
  if (!active) {
    const { data: billing } = await supabase.from("seller_billing").select("trial_started_at,trial_ends_at,registration_paid_at").eq("seller_id", profile.id).maybeSingle();
    if (!billing || (!billing.registration_paid_at && (!billing.trial_ends_at || new Date(billing.trial_ends_at).getTime() <= Date.now()))) {
      redirect("/seller/billing?error=" + encodeURIComponent("Your free trial has ended. Pay the RWF 5,000 registration fee before reactivating listings."));
    }
  }
  const { error } = await supabase.from("listings").update({ active: !active }).eq("id", id).eq("shop_id", shop.id);
  if (error) redirect("/seller/billing?error=" + encodeURIComponent("This listing action is not available while your seller registration is unpaid."));
  revalidatePath("/seller/listings");
}

export async function deleteListing(formData: FormData) {
  const profile = await requireRole(["seller"]);
  const shop = await getMyShop(profile.id);
  if (!shop) return;
  const supabase = await createClient();
  await supabase.from("listings").delete().eq("id", text(formData, "id")).eq("shop_id", shop.id);
  revalidatePath("/seller/listings");
}

export async function updateOrderStatus(formData: FormData) {
  const profile = await requireRole(["seller"]);
  const shop = await getMyShop(profile.id);
  if (!shop) return;
  const status = text(formData, "status");
  if (!ORDER_STATUSES.includes(status)) return;
  const supabase = await createClient();
  await supabase.from("orders").update({ status }).eq("id", text(formData, "id")).eq("shop_id", shop.id);
  revalidatePath("/seller/orders");
  revalidatePath("/seller");
}

export async function submitRegistrationPayment(formData: FormData) {
  const profile = await requireRole(["seller"]);
  const supabase = await createClient();
  const method = text(formData, "method");
  const reference = text(formData, "transaction_reference");
  if (!["mtn_momo", "equity_bank"].includes(method) || !reference) redirect("/seller/billing?error=" + encodeURIComponent("Choose a payment method and enter the transaction reference."));
  const { data: billing } = await supabase.from("seller_billing").select("registration_paid_at").eq("seller_id", profile.id).maybeSingle();
  if (billing?.registration_paid_at) redirect("/seller/billing?success=" + encodeURIComponent("Your registration fee is already verified."));
  const { error } = await supabase.from("seller_fee_payments").insert({ seller_id: profile.id, amount_rwf: 5000, method, transaction_reference: reference, status: "pending" });
  if (error) redirect("/seller/billing?error=" + encodeURIComponent("Could not submit payment for review. Check whether this transaction reference was already submitted."));
  revalidatePath("/seller/billing");
  revalidatePath("/admin/billing");
  redirect("/seller/billing?success=" + encodeURIComponent("Payment submitted. Selling access will unlock after an administrator verifies it."));
}
