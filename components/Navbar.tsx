import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";
import { BRAND } from "@/lib/brand";
import CartLink from "@/components/CartLink";

export default async function Navbar() {
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const profile = configured ? await getCurrentProfile() : null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-sm shadow-slate-900/[0.025] backdrop-blur-xl">
      <div className="hidden bg-slate-950 text-slate-300 sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-2 text-[11px] font-medium">
          <span>Discover local. Shop confidently. Support Rwanda.</span>
          <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Marketplace for local businesses <span className="text-slate-600">|</span> {BRAND.city}, Rwanda</span>
        </div>
      </div>
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label={`${BRAND.name} home`}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-700 text-lg font-black text-white shadow-sm transition group-hover:rotate-[-4deg]">T<span className="text-emerald-300">.</span></span>
          <span><span className="block text-lg font-black leading-tight tracking-tight text-slate-950">{BRAND.name}</span><span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:block">Local marketplace</span></span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <Link href="/browse" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-brand-700">Explore all</Link>
          <Link href="/browse?type=shop" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-brand-700">Shops</Link>
          <Link href="/browse?type=restaurant" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-brand-700">Restaurants</Link>
          <Link href="/browse?type=salon" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-brand-700">Beauty & salons</Link>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <CartLink />
          {profile ? (
            <>
              {profile.role === "admin" && <Link href="/admin" className="hidden rounded-lg px-3 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50 sm:inline-flex">Admin</Link>}
              {profile.role === "seller" && <Link href="/seller" className="hidden rounded-lg px-3 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50 sm:inline-flex">Seller studio</Link>}
              {profile.role === "buyer" && <Link href="/orders" className="hidden rounded-lg px-3 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50 sm:inline-flex">My orders</Link>}
              <form action={logout}><button className="btn-outline btn-sm" type="submit">Sign out</button></form>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden px-2 py-2 text-sm font-bold text-slate-700 transition hover:text-brand-700 sm:inline-flex">Sign in</Link>
              <Link href="/register" className="btn btn-sm">Get started <span className="ml-1 hidden sm:inline">↗</span></Link>
            </>
          )}
        </div>
      </nav>
      <div className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2.5 md:hidden">
        <Link href="/browse" className="shrink-0 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700">Explore all</Link>
        <Link href="/browse?type=shop" className="shrink-0 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700">Shops</Link>
        <Link href="/browse?type=restaurant" className="shrink-0 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700">Restaurants</Link>
        <Link href="/browse?type=salon" className="shrink-0 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700">Beauty & salons</Link>
        {profile?.role === "seller" && <Link href="/seller" className="shrink-0 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800">Seller studio</Link>}
        {profile?.role === "buyer" && <Link href="/orders" className="shrink-0 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800">My orders</Link>}
        {profile?.role === "admin" && <Link href="/admin" className="shrink-0 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800">Admin</Link>}
      </div>
    </header>
  );
}
