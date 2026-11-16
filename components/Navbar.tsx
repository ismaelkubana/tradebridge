import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";
import { BRAND } from "@/lib/brand";
import CartLink from "@/components/CartLink";
import MenuTab from "@/components/MenuTab";

function NavLink({ href, children, accent = false }: { href: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <Link
      href={href}
      className={accent
        ? "inline-flex shrink-0 items-center rounded-xl bg-brand-50 px-3.5 py-2 text-sm font-bold text-brand-700 transition hover:bg-brand-100"
        : "inline-flex shrink-0 items-center rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"}
    >
      {children}
    </Link>
  );
}

export default async function Navbar() {
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const profile = configured ? await getCurrentProfile() : null;

  return (
    <header className="site-header sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-sm shadow-slate-900/[0.025] backdrop-blur-xl">
      <div className="hidden bg-slate-950 text-slate-300 sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-2 text-[11px] font-medium">
          <span>Discover local. Shop confidently. Support Rwanda.</span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Delivering to <strong className="font-bold text-white">{BRAND.city}, Rwanda</strong>
          </span>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-2.5" aria-label={`${BRAND.name} home`}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-700 text-lg font-black text-white shadow-sm transition group-hover:-rotate-3">
            T<span className="text-emerald-300">.</span>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-black leading-tight tracking-tight text-slate-950 sm:text-lg">{BRAND.name}</span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 sm:block">Kigali, connected</span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
          <NavLink href="/">Discover</NavLink>
          <NavLink href="/browse">Explore</NavLink>
          <NavLink href="/wishlist">♡ Saved</NavLink>
          {profile?.role === "buyer" && <NavLink href="/orders">▤ My orders</NavLink>}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 xl:inline-flex">
            <span className="text-emerald-600">⌖</span> {BRAND.city}, Rwanda
          </span>
          <MenuTab role={profile?.role ?? null} />
          <CartLink />
          {profile ? (
            <>
              {profile.role === "admin" && <Link href="/admin" className="hidden rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-brand-700 sm:inline-flex">Admin console ↗</Link>}
              {profile.role === "seller" && <Link href="/seller" className="hidden rounded-xl bg-brand-700 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-brand-800 sm:inline-flex">Seller studio ↗</Link>}
              <div className="hidden max-w-36 sm:block">
                <p className="truncate text-xs font-bold text-slate-800">{profile.full_name || "My account"}</p>
                <p className="text-[10px] font-medium capitalize text-slate-400">{profile.role || "Member"}</p>
              </div>
              <form action={logout}><button className="btn-outline btn-sm" type="submit">Sign out</button></form>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-brand-700 sm:inline-flex">Sign in</Link>
              <Link href="/register" className="btn btn-sm">Get started <span className="ml-1 hidden sm:inline">↗</span></Link>
            </>
          )}
        </div>
      </div>

      <nav aria-label="Mobile navigation" className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2.5 lg:hidden">
        <NavLink href="/">Discover</NavLink>
        <NavLink href="/browse">Explore</NavLink>
        <NavLink href="/wishlist">♡ Saved</NavLink>
        {profile?.role === "buyer" && <NavLink href="/orders">▤ My orders</NavLink>}
        {profile?.role === "seller" && <NavLink href="/seller" accent>Seller studio</NavLink>}
        {profile?.role === "admin" && <NavLink href="/admin" accent>Admin console</NavLink>}
      </nav>
    </header>
  );
}
