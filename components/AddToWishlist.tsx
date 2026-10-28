"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readWishlist, writeWishlist, type WishlistItem } from "@/lib/wishlist";

export default function AddToWishlist({ item }: { item: WishlistItem }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const sync = () => setSaved(readWishlist().some((entry) => entry.listingId === item.listingId));
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("tradebridge:wishlist-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("tradebridge:wishlist-change", sync);
    };
  }, [item.listingId]);

  function toggle() {
    const current = readWishlist();
    const exists = current.some((entry) => entry.listingId === item.listingId);
    writeWishlist(exists ? current.filter((entry) => entry.listingId !== item.listingId) : [item, ...current]);
    setSaved(!exists);
  }

  return (
    <button type="button" onClick={toggle} aria-pressed={saved} aria-label={saved ? `Remove ${item.title} from wishlist` : `Save ${item.title} to wishlist`} title={saved ? "Remove from wishlist" : "Save to wishlist"} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition ${saved ? "border-rose-200 bg-rose-50 text-rose-600" : "border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"}`}>
      <span className="text-lg" aria-hidden="true">{saved ? "♥" : "♡"}</span>
    </button>
  );
}
