"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartTotal, readCart, writeCart, type Cart } from "@/lib/cart";
import { formatRWF } from "@/lib/format";

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCart(readCart());
    setReady(true);
  }, []);

  function update(next: Cart | null) {
    writeCart(next);
    setCart(next && next.items.length > 0 ? next : null);
  }

  function changeQty(listingId: string, delta: number) {
    if (!cart) return;
    const items = cart.items
      .map((i) => (i.listingId === listingId ? { ...i, qty: i.qty + delta } : i))
      .filter((i) => i.qty > 0);
    update({ ...cart, items });
  }

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

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Your {isSalon ? "booking" : "cart"}</h1>
      <p className="text-sm text-gray-500">From <strong>{cart.shopName}</strong></p>

      <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
        {cart.items.map((i) => (
          <li key={i.listingId} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-medium">{i.title}</p>
              <p className="text-sm text-gray-500">{formatRWF(i.price)} each</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-outline btn-sm" onClick={() => changeQty(i.listingId, -1)} aria-label="Decrease">−</button>
              <span className="w-6 text-center text-sm">{i.qty}</span>
              <button className="btn-outline btn-sm" onClick={() => changeQty(i.listingId, 1)} aria-label="Increase">+</button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
        <p className="text-lg font-bold">Total: {formatRWF(cartTotal(cart))}</p>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={() => update(null)}>Clear</button>
          <Link href="/checkout" className="btn">Continue</Link>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Final prices are confirmed by the seller. Pay the seller directly (cash or mobile money) when your order is confirmed.
      </p>
    </div>
  );
}
