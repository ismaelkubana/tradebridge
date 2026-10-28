"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { placeOrder } from "./actions";
import { cartTotal, readCart, type Cart } from "@/lib/cart";
import { formatRWF } from "@/lib/format";

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutForm />
    </Suspense>
  );
}

function CheckoutForm() {
  const params = useSearchParams();
  const error = params.get("error");
  const [cart, setCart] = useState<Cart | null>(null);
  const [ready, setReady] = useState(false);
  const [fulfillment, setFulfillment] = useState<string>("delivery");

  useEffect(() => {
    const c = readCart();
    setCart(c);
    if (c?.shopType === "salon") setFulfillment("booking");
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!cart) {
    return (
      <div className="card mx-auto max-w-lg text-center">
        <p className="text-gray-600">Your cart is empty.</p>
        <Link href="/browse" className="btn mt-4">Browse businesses</Link>
      </div>
    );
  }

  const isSalon = cart.shopType === "salon";
  const payload = JSON.stringify({
    shopId: cart.shopId,
    items: cart.items.map((i) => ({ listingId: i.listingId, qty: i.qty })),
  });

  return (
    <div className="mx-auto max-w-lg">
      <div className="card">
        <h1 className="mb-1 text-2xl font-bold">{isSalon ? "Book appointment" : "Checkout"}</h1>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-700">Step 1 of 2 · Delivery details</p>
        <p className="mb-4 text-sm text-gray-500">
          {cart.shopName} · {formatRWF(cartTotal(cart))}
        </p>

        {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <form action={placeOrder} className="space-y-4">
          <input type="hidden" name="cart" value={payload} />
          <input type="hidden" name="fulfillment" value={fulfillment} />

          {!isSalon && (
            <div>
              <span className="label">How do you want to receive it?</span>
              <div className="grid grid-cols-2 gap-3">
                {["delivery", "pickup"].map((f) => (
                  <label
                    key={f}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${
                      fulfillment === f ? "border-brand-500 bg-brand-50" : "border-gray-300"
                    }`}
                  >
                    <input type="radio" checked={fulfillment === f} onChange={() => setFulfillment(f)} />
                    {f === "delivery" ? "Delivery" : "Pickup"}
                  </label>
                ))}
              </div>
            </div>
          )}

          {fulfillment === "delivery" && (
            <div>
              <label className="label" htmlFor="address">Delivery address / landmark</label>
              <input id="address" name="address" required className="input" autoComplete="street-address" placeholder="e.g. KG 11 Ave, near the market" />
            </div>
          )}

          {isSalon && (
            <div>
              <label className="label" htmlFor="scheduled_at">Preferred date and time</label>
              <input id="scheduled_at" name="scheduled_at" type="datetime-local" className="input" required />
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-700">Step 2 of 2 · Contact and confirm</p>
            <label className="label" htmlFor="contact_phone">Your phone number</label>
            <input id="contact_phone" name="contact_phone" type="tel" required className="input" placeholder="07XXXXXXXX" />
          </div>

          <div>
            <label className="label" htmlFor="note">Note to the seller (optional)</label>
            <textarea id="note" name="note" rows={2} className="input" />
          </div>

          <button type="submit" className="btn w-full">
            {isSalon ? "Send booking request" : "Place order"}
          </button>
          <p className="text-xs text-gray-500">
            The seller will confirm your {isSalon ? "booking" : "order"}. You pay the seller directly when it is confirmed.
          </p>
        </form>
      </div>
    </div>
  );
}
