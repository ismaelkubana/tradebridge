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

function checkoutMessage(message?: string): string {
  const error = (message ?? "").toLowerCase();
  if (error.includes("authentication required")) return "Please sign in again, then try placing your order.";
  if (error.includes("cart is empty")) return "Your cart is empty. Add an item and try again.";
  if (error.includes("duplicate listing")) return "Your cart contains the same item more than once. Remove the duplicate and try again.";
  if (error.includes("listing is unavailable")) return "One of these items is no longer available. Refresh the business page and update your cart.";
  if (error.includes("insufficient stock")) return "There isn't enough stock for the quantity you selected. Reduce the quantity and try again.";
  if (error.includes("contact phone")) return "Please enter a phone number so the seller can contact you.";
  if (error.includes("delivery address")) return "Please enter your delivery address or a nearby landmark.";
  if (error.includes("booking date")) return "Please choose a date and time for your appointment.";
  if (error.includes("invalid fulfillment")) return "Choose delivery or pickup to continue.";
  if (error.includes("approved") || error.includes("seller") || error.includes("order")) {
    return "This business cannot accept orders right now. Please try another business or contact support.";
  }
  return "We couldn't place your order right now. Your payment has not been taken. Please refresh your cart and try again.";
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
    return fail("Your cart is empty. Add an item and try again.");
  }
  if (cart.items.length > 50 || cart.items.some((item) =>
    !item || typeof item.listingId !== "string" || !Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > 100
  )) {
    return fail("Your cart contains an invalid item or quantity. Please update your cart and try again.");
  }

  const fulfillment = String(formData.get("fulfillment") ?? "");
  if (!["delivery", "pickup", "booking"].includes(fulfillment)) return fail("Choose how you want to receive this.");
  const address = String(formData.get("address") ?? "").trim().slice(0, 500);
  const phone = String(formData.get("contact_phone") ?? "").trim().slice(0, 40);
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  const scheduledRaw = String(formData.get("scheduled_at") ?? "");

  if (!phone) return fail("Please enter a phone number so the seller can reach you.");
  if (fulfillment === "delivery" && !address) return fail("Please enter your delivery address or a nearby landmark.");
  if (fulfillment === "booking" && !scheduledRaw) return fail("Please choose a date and time for your appointment.");

  let scheduledAt: string | null = null;
  if (scheduledRaw) {
    const parsed = new Date(scheduledRaw);
    if (Number.isNaN(parsed.getTime())) return fail("Please choose a valid date and time.");
    if (parsed.getTime() < Date.now() - 60_000) return fail("Please choose a future date and time.");
    scheduledAt = parsed.toISOString();
  }

  // The database validates the current shop status, prices, stock and seller trial.
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
    // Keep detailed database errors in server logs, not in the browser.
    console.error("place_marketplace_order failed", { code: error?.code, message: error?.message, userId: user.id });
    return fail(checkoutMessage(error?.message));
  }

  redirect(`/orders/${orderId}?placed=1`);
}
