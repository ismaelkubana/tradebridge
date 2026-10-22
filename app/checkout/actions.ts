"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Listing } from "@/lib/types";

interface CartPayload {
  shopId: string;
  items: { listingId: string; qty: number }[];
}

function fail(message: string): never {
  redirect(`/checkout?error=${encodeURIComponent(message)}`);
}

export async function placeOrder(formData: FormData) {
  const supabase = createClient();
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

  // Never trust prices sent from the browser: read them from the database.
  const ids = cart.items.map((i) => i.listingId);
  const { data: listingData } = await supabase
    .from("listings")
    .select("*")
    .in("id", ids)
    .eq("shop_id", cart.shopId)
    .eq("active", true);
  const listings = (listingData as Listing[]) ?? [];
  const byId = new Map(listings.map((l) => [l.id, l]));

  const lines: { listing: Listing; qty: number }[] = [];
  for (const item of cart.items) {
    const listing = byId.get(item.listingId);
    const qty = Math.floor(Number(item.qty));
    if (!listing || !(qty > 0)) return fail("Some items in your cart are no longer available.");
    if (listing.stock !== null && qty > listing.stock) {
      return fail(`Only ${listing.stock} of "${listing.title}" left in stock.`);
    }
    lines.push({ listing, qty });
  }

  const total = lines.reduce((sum, l) => sum + l.listing.price_rwf * l.qty, 0);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      buyer_id: user.id,
      shop_id: cart.shopId,
      fulfillment,
      address,
      contact_phone: phone,
      note,
      scheduled_at: scheduledRaw ? new Date(scheduledRaw).toISOString() : null,
      total_rwf: total,
    })
    .select("id")
    .single();

  if (orderError || !order) return fail("Could not place the order. This business may not be accepting orders right now.");

  const { error: itemsError } = await supabase.from("order_items").insert(
    lines.map((l) => ({
      order_id: order.id,
      listing_id: l.listing.id,
      title: l.listing.title,
      price_rwf: l.listing.price_rwf,
      qty: l.qty,
    }))
  );
  if (itemsError) return fail("Could not save your order items. Please try again.");

  redirect(`/orders/${order.id}?placed=1`);
}
