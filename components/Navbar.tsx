import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";
import { BRAND } from "@/lib/brand";
import CartLink from "@/components/CartLink";

export default async function Navbar() {
  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const profile = configured ? await getCurrentProfile() : null;

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-xl font-extrabold text-brand-700">
          {BRAND.name}
        </Link>

        <div className="hidden items-center gap-5 text-sm font-medium text-gray-700 sm:flex">
          <Link href="/browse?type=shop" className="hover:text-brand-600">Shops</Link>
          <Link href="/browse?type=restaurant" className="hover:text-brand-600">Restaurants</Link>
          <Link href="/browse?type=salon" className="hover:text-brand-600">Salons</Link>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <CartLink />
          {profile ? (
            <>
              {profile.role === "admin" && (
                <Link href="/admin" className="font-medium text-brand-700 hover:underline">Admin</Link>
              )}
              {profile.role === "seller" && (
                <Link href="/seller" className="font-medium text-brand-700 hover:underline">My business</Link>
              )}
              {profile.role === "buyer" && (
                <Link href="/orders" className="font-medium text-brand-700 hover:underline">My orders</Link>
              )}
              <form action={logout}>
                <button className="btn-outline btn-sm" type="submit">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="font-medium text-gray-700 hover:text-brand-600">Sign in</Link>
              <Link href="/register" className="btn btn-sm">Join</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
