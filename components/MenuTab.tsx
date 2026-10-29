"use client";

import { useState } from "react";
import Link from "next/link";

type MenuTabProps = { role: "admin" | "seller" | "buyer" | null };

const baseLinks = [
  { href: "/", label: "Home", detail: "Back to the marketplace" },
  { href: "/browse", label: "Explore all", detail: "Browse every approved business" },
  { href: "/browse?type=shop", label: "Shops & products", detail: "Groceries and everyday essentials" },
  { href: "/browse?type=restaurant", label: "Restaurants", detail: "Meals, snacks and menu items" },
  { href: "/browse?type=salon", label: "Beauty & salons", detail: "Beauty and personal-care services" },
  { href: "/wishlist", label: "Wishlist", detail: "Products you have saved" },
  { href: "/cart", label: "Shopping cart", detail: "Review items before checkout" },
];

export default function MenuTab({ role }: MenuTabProps) {
  const [open, setOpen] = useState(false);
  const links = [...baseLinks];
  if (role === "buyer") links.push({ href: "/orders", label: "My orders", detail: "View your order history" });
  if (role === "seller") links.push({ href: "/seller", label: "Seller studio", detail: "Manage your business and listings" });
  if (role === "admin") links.push({ href: "/admin", label: "Admin dashboard", detail: "Manage marketplace activity" });
  if (!role) links.push({ href: "/login", label: "Sign in", detail: "Access your TradeBridge account" }, { href: "/register", label: "Create an account", detail: "Join TradeBridge" });

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="tradebridge-menu-panel"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
      >
        <span className="flex w-4 flex-col gap-[3px]" aria-hidden="true"><span className="h-0.5 w-4 rounded bg-current" /><span className="h-0.5 w-4 rounded bg-current" /><span className="h-0.5 w-4 rounded bg-current" /></span>
        Menu
        <span className={`text-xs transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">⌄</span>
      </button>

      {open && (
        <>
          <button aria-label="Close menu" className="fixed inset-0 z-40 cursor-default bg-slate-950/20" onClick={() => setOpen(false)} />
          <div id="tradebridge-menu-panel" role="menu" className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-950/15">
            <div className="rounded-xl bg-slate-950 px-4 py-3 text-white">
              <p className="text-sm font-extrabold">TradeBridge menu</p>
              <p className="mt-1 text-xs text-slate-300">Discover local businesses across Kigali.</p>
            </div>
            <div className="mt-2 grid gap-1">
              {links.map((link) => (
                <Link key={link.href} role="menuitem" href={link.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 transition hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none">
                  <span className="block text-sm font-bold text-slate-800">{link.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{link.detail}</span>
                </Link>
              ))}
            </div>
            <div className="mt-2 border-t border-slate-100 p-2">
              <Link href={role === "seller" ? "/seller/listings" : "/register"} onClick={() => setOpen(false)} className="flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-800">
                {role === "seller" ? "Manage products →" : "Start selling →"}
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
