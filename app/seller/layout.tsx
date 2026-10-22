import Link from "next/link";
import { requireRole, getMyShop } from "@/lib/auth";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["seller"]);
  const shop = await getMyShop(profile.id);

  const links = [
    { href: "/seller", label: "Overview" },
    { href: "/seller/listings", label: "Products / Menu / Services" },
    { href: "/seller/orders", label: "Orders & bookings" },
    { href: "/seller/shop", label: "Business profile" },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <aside className="space-y-1">
        <div className="card mb-3 !p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Seller portal</p>
          <p className="mt-1 font-semibold">{shop?.name ?? profile.full_name}</p>
          {shop && <div className="mt-2"><StatusBadge value={shop.status} /></div>}
        </div>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white hover:text-brand-700"
          >
            {l.label}
          </Link>
        ))}
      </aside>
      <section>{children}</section>
    </div>
  );
}
