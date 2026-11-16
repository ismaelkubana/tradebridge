import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { BRAND } from "@/lib/brand";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: `${BRAND.name} | ${BRAND.tagline}`,
  description: `${BRAND.tagline} Discover local shops, restaurants and services in ${BRAND.city}, Rwanda.`,
  applicationName: BRAND.name,
};

const themes: Record<string, Record<string, string>> = {
  emerald: { "50":"#ecfdf5","100":"#d1fae5","500":"#10b981","600":"#059669","700":"#047857" },
  ocean: { "50":"#eff6ff","100":"#dbeafe","500":"#3b82f6","600":"#2563eb","700":"#1d4ed8" },
  amber: { "50":"#fffbeb","100":"#fef3c7","500":"#f59e0b","600":"#d97706","700":"#b45309" },
  violet: { "50":"#f5f3ff","100":"#ede9fe","500":"#8b5cf6","600":"#7c3aed","700":"#6d28d9" },
  rose: { "50":"#fff1f2","100":"#ffe4e6","500":"#f43f5e","600":"#e11d48","700":"#be123c" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let selected = "emerald";
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("platform_settings").select("value").eq("key", "site_theme").maybeSingle();
    const value = data?.value as { preset?: string } | null;
    if (value?.preset && themes[value.preset]) selected = value.preset;
  } catch { /* Keep the safe default theme if settings are unavailable. */ }
  const palette = themes[selected];
  const themeStyle = Object.fromEntries(Object.entries(palette).map(([key, value]) => [`--brand-${key}`, value])) as React.CSSProperties;

  return (
    <html lang="en" style={themeStyle}>
      <body className="min-h-screen">
        <Navbar />
        <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-7 sm:px-5 sm:py-10">{children}</main>
        <footer className="mt-12 border-t border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <Link href="/" className="inline-flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 font-black text-white">T<span className="text-emerald-300">.</span></span>
                <span className="text-lg font-black tracking-tight text-slate-950">{BRAND.name}</span>
              </Link>
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">{BRAND.tagline}. Discover local businesses and help sellers reach more customers across Rwanda.</p>
              <p className="mt-4 text-xs font-semibold text-slate-400">{BRAND.city}, Rwanda 🇷🇼</p>
            </div>
            <div><h2 className="text-sm font-extrabold text-slate-900">Discover</h2><div className="mt-4 flex flex-col items-start gap-3 text-sm text-slate-500"><Link href="/browse" className="hover:text-brand-700">Explore marketplace</Link><Link href="/browse?type=shop" className="hover:text-brand-700">Shops & products</Link><Link href="/browse?type=restaurant" className="hover:text-brand-700">Restaurants</Link><Link href="/browse?type=salon" className="hover:text-brand-700">Beauty & salons</Link></div></div>
            <div><h2 className="text-sm font-extrabold text-slate-900">For businesses</h2><div className="mt-4 flex flex-col items-start gap-3 text-sm text-slate-500"><Link href="/register" className="hover:text-brand-700">Start selling</Link><Link href="/login" className="hover:text-brand-700">Seller sign in</Link><p className="max-w-xs text-xs leading-5 text-slate-400">Seller trial and registration terms apply. Payment details are shown only when configured by the platform.</p></div></div>
          </div>
          <div className="border-t border-slate-100"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</span><span>Built to connect local businesses with their communities.</span></div></div>
        </footer>
      </body>
    </html>
  );
}
