import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { BRAND } from "@/lib/brand";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: `${BRAND.name} | ${BRAND.tagline}`,
  description: `${BRAND.tagline} Discover local shops, restaurants and services in ${BRAND.city}, Rwanda.`,
  applicationName: BRAND.name,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Navbar />
        <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-7 sm:px-5 sm:py-10">{children}</main>
        <Analytics />
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
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Discover</h2>
              <div className="mt-4 flex flex-col items-start gap-3 text-sm text-slate-500">
                <Link href="/browse" className="hover:text-brand-700">Explore marketplace</Link>
                <Link href="/browse?type=shop" className="hover:text-brand-700">Shops & products</Link>
                <Link href="/browse?type=restaurant" className="hover:text-brand-700">Restaurants</Link>
                <Link href="/browse?type=salon" className="hover:text-brand-700">Beauty & salons</Link>
              </div>
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">For businesses</h2>
              <div className="mt-4 flex flex-col items-start gap-3 text-sm text-slate-500">
                <Link href="/register" className="hover:text-brand-700">Start selling</Link>
                <Link href="/login" className="hover:text-brand-700">Seller sign in</Link>
                <p className="max-w-xs text-xs leading-5 text-slate-400">Seller trial and registration terms apply. Payment details are shown only when configured by the platform.</p>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</span>
              <span>Built to connect local businesses with their communities.</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
