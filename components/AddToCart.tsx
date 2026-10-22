"use client";

import { useState } from "react";
import { readCart, writeCart, type Cart } from "@/lib/cart";
import type { Listing, Shop } from "@/lib/types";

export default function AddToCart({ shop, listing }: { shop: Shop; listing: Listing }) {
  const [added, setAdded] = useState(false);
  const soldOut = listing.stock !== null && listing.stock <= 0;

  function add() {
    let cart = readCart();

    if (cart && cart.shopId !== shop.id) {
      const ok = window.confirm(
        `Your cart has items from ${cart.shopName}. Start a new cart with ${shop.name}?`
      );
      if (!ok) return;
      cart = null;
    }

    const next: Cart = cart ?? {
      shopId: shop.id,
      shopName: shop.name,
      shopType: shop.type,
      items: [],
    };

    const existing = next.items.find((i) => i.listingId === listing.id);
    if (existing) {
      const max = listing.stock ?? Infinity;
      existing.qty = Math.min(existing.qty + 1, max);
    } else {
      next.items.push({
        listingId: listing.id,
        title: listing.title,
        price: listing.price_rwf,
        qty: 1,
      });
    }

    writeCart(next);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  const label =
    shop.type === "salon" ? "Book" : "Add to cart";

  return (
    <button onClick={add} disabled={soldOut} className="btn btn-sm">
      {soldOut ? "Sold out" : added ? "Added ✓" : label}
    </button>
  );
}
