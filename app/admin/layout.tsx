import Link from "next/link";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const groups = [
  {
    title: "Marketplace",
    links: [
      { href: "/admin", label: "Overview", icon: "▦" },
      { href: "/admin/shops", label: "Businesses", icon: "▤" },
      { href: "/admin/users", label: "Users & roles", icon: "♙" },
    ],
  },
  {
    title: "Operations",
    links: [
      { href: "/admin/orders", label: "Orders", icon: "⇄" },
      { href: "/admin/payments", label: "Order payments", icon: "▣" },
      { href: "/admin/billing", label: "Seller billing", icon: "R" },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireRole(["admin"]);

  return (
    <div className="min-h-[70vh]">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-700 text-lg font-black text-white">T</div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">TradeBridge</p>
            <h1 className="text-lg font-bold text-gray-950">Control center</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:inline-flex">● Secure admin session</span>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">{admin.full_name || "Administrator"}</p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="mb-3 px-3 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Workspace</p>
          </div>
          {groups.map((group) => (
            <div key={group.title} className="mb-5 last:mb-1">
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">{group.title}</p>
              <nav className="space-y-1" aria-label={group.title}>
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-brand-50 hover:text-brand-800">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-600">{link.icon}</span>
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
          <div className="mt-4 rounded-xl bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-800">Admin access</p>
            <p className="mt-1 text-xs leading-5 text-gray-500">Actions are protected by your signed-in TradeBridge administrator role.</p>
          </div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
