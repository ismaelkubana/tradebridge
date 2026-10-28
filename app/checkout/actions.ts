"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface CartPayload {
  shopId: string;
  items: { listingId: string; qty: number }[];
}

function fail(message: string): never {
  redirect(`/checkout?error=${encodeURIComponent(message)}`);
}

export async function placeOrder(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/checkout");

  let cart: CartPayload;
  try {
    cart = JSON.parse(String(formData.get("cart") ?? ""));
  } catch {
    return fail("Your cart could not be read. Please add items again.");
  }
  if (!cart?.shopId || !Array.isArray(cart.items) || cart.items.length === 0) {
    return fail("Your cart is empty.");
  }

  const fulfillment = String(formData.get("fulfillment") ?? "");
  if (!["delivery", "pickup", "booking"].includes(fulfillment)) return fail("Choose how you want to receive this.");
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("contact_phone") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const scheduledRaw = String(formData.get("scheduled_at") ?? "");

  if (!phone) return fail("Please enter a phone number so the seller can reach you.");
  if (fulfillment === "delivery" && !address) return fail("Please enter a delivery address or landmark.");
  if (fulfillment === "booking" && !scheduledRaw) return fail("Please choose a date and time for your appointment.");

  let scheduledAt: string | null = null;
  if (scheduledRaw) {
    const parsed = new Date(scheduledRaw);
    if (Number.isNaN(parsed.getTime())) return fail("Please choose a valid date and time.");
    scheduledAt = parsed.toISOString();
  }

  // The database function validates current prices and stock, then writes the
  // order and all order items in one transaction. Do not trust client totals.
  const { data: orderId, error } = await supabase.rpc("place_marketplace_order", {
    p_shop_id: cart.shopId,
    p_fulfillment: fulfillment,
    p_address: address,
    p_contact_phone: phone,
    p_note: note,
    p_scheduled_at: scheduledAt,
    p_items: cart.items,
  });

  if (error || !orderId) {
    return fail("Could not place the order. Please check that the items are still available and try again.");
  }

  redirect(`/orders/${orderId}?placed=1`);
}
