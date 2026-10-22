import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ShopCard from "@/components/ShopCard";
import { BRAND } from "@/lib/brand";
import type { Shop } from "@/lib/types";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  { type: "shop", label: "Shops", icon: "🛍️", text: "Electronics, fashion, groceries and more" },
  { type: "restaurant", label: "Restaurants", icon: "🍽️", text: "Order food for delivery or pickup" },
  { type: "salon", label: "Salons", icon: "💇", text: "Book hair and beauty appointments" },
];

export default async function HomePage() {
  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let shops: Shop[] = [];
  if (configured) {
    const supabase = createClient();
    const { data } = await supabase
      .from("shops")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(8);
    shops = (data as Shop[]) ?? [];
  }

  return (
    <div className="space-y-10">
      {!configured && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Setup needed:</strong> add your Supabase keys to <code>.env.local</code> (see README).
          The site will show real shops once the database is connected.
        </div>
      )}

      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 px-6 py-14 text-center text-white">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{BRAND.name}</h1>
        <p className="mx-auto mt-3 max-w-xl text-brand-100">{BRAND.tagline}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/browse" className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
            Start browsing
          </Link>
          <Link href="/register" className="rounded-lg border border-white/60 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">
            Sell on {BRAND.name}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {CATEGORIES.map((c) => (
          <Link key={c.type} href={`/browse?type=${c.type}`} className="card text-center transition hover:shadow-md">
            <div className="text-4xl">{c.icon}</div>
            <h2 className="mt-2 font-semibold">{c.label}</h2>
            <p className="mt-1 text-sm text-gray-500">{c.text}</p>
          </Link>
        ))}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">New on {BRAND.name}</h2>
        {shops.length === 0 ? (
          <p className="text-sm text-gray-500">No approved businesses yet. Be the first to join!</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {shops.map((s) => (
              <ShopCard key={s.id} shop={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
