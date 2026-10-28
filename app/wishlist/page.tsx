"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatRWF } from "@/lib/format";
import { readWishlist, writeWishlist, type WishlistItem } from "@/lib/wishlist";

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setItems(readWishlist());
    sync();
    setReady(true);
    window.addEventListener("storage", sync);
    window.addEventListener("tradebridge:wishlist-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("tradebridge:wishlist-change", sync);
    };
  }, []);

  function remove(id: string) {
    const next = items.filter((item) => item.listingId !== id);
    writeWishlist(next);
    setItems(next);
  }

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 px-6 py-9 text-white sm:px-10 sm:py-12">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-rose-300">YOUR SAVED FINDS</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Your wishlist</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Keep the products and services you love in one place, ready for your next visit.</p></div><div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3"><p className="text-2xl font-black">{items.length}</p><p className="text-xs text-slate-300">saved {items.length === 1 ? "item" : "items"}</p></div></div>
      </div>
      {items.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-3xl text-rose-600">♡</span><h2 className="mt-4 text-lg font-extrabold text-slate-900">Save things you love</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Tap the heart on a product or service to keep it here. Your wishlist is saved in this browser on this device.</p><Link href="/browse" className="btn mt-5">Explore businesses</Link></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((item) => <article key={item.listingId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><Link href={`/shops/${item.shopId}`} className="flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-rose-50">{item.imageUrl ? <img src={item.imageUrl} alt={item.title} loading="lazy" className="h-full w-full object-cover" /> : <span className="text-5xl text-slate-300">♡</span>}</Link><div className="p-4"><p className="text-xs font-semibold text-slate-500">{item.shopName}</p><Link href={`/shops/${item.shopId}`} className="mt-1 block font-extrabold text-slate-900 hover:text-brand-700">{item.title}</Link><p className="mt-3 text-lg font-black text-brand-700">{formatRWF(item.price)}</p><div className="mt-4 flex gap-2"><Link href={`/shops/${item.shopId}`} className="btn flex-1">View item</Link><button type="button" onClick={() => remove(item.listingId)} className="btn-outline" aria-label={`Remove ${item.title} from wishlist`}>Remove</button></div></div></article>)}</div>}
    </div>
  );
}
