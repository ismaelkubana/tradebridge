import Link from "next/link";
import { requireRole } from "@/lib/auth";
import AdminRealtimeRefresh from "./AdminRealtimeRefresh";

export const dynamic = "force-dynamic";

const groups = [
  { title: "Workspace", links: [
    { href: "/admin", label: "Overview", icon: "⌂" },
    { href: "/admin/shops", label: "Businesses", icon: "▤" },
    { href: "/admin/users", label: "Users & roles", icon: "♙" },
    { href: "/admin/users?role=buyer", label: "Customers", icon: "◎" },
  ]},
  { title: "Commerce", links: [
    { href: "/admin/orders", label: "Orders & fulfillment", icon: "⇄" },
    { href: "/admin/payments", label: "Order payments", icon: "▣" },
    { href: "/admin/billing", label: "Seller subscriptions", icon: "R" },
    { href: "/admin/settings", label: "Pricing & controls", icon: "⚙" },
  ]},
  { title: "Insights & governance", links: [
    { href: "/admin/audit", label: "Activity & audit", icon: "≋" },
    { href: "/admin/appearance", label: "Website appearance", icon: "◐" },
  ]},
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireRole(["admin"]);
  return (
    <div className="admin-shell -mx-4 -my-7 min-h-screen bg-[#f5f3ee] text-slate-900 sm:-mx-5 sm:-my-10">
      <AdminRealtimeRefresh />
      <aside className="admin-sidebar">
        <Link href="/admin" className="flex items-center gap-3 px-3 py-5">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--brand-700)] text-xl font-black text-white shadow-lg">T.</span>
          <span><span className="block text-lg font-black tracking-tight">TradeBridge</span><span className="block text-xs text-slate-500">Commerce control center</span></span>
        </Link>
        <div className="mx-3 mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800"><span className="h-2 w-2 rounded-full bg-emerald-500" /> PLATFORM CONNECTED</div>
          <p className="mt-1 text-[11px] leading-4 text-emerald-700">Supabase data and live refresh are enabled.</p>
        </div>
        {groups.map(group => <section key={group.title} className="mb-5 px-3">
          <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[.18em] text-slate-400">{group.title}</p>
          <nav className="space-y-1" aria-label={group.title}>
            {group.links.map(link => <Link key={link.href} href={link.href} className="admin-nav-link">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm text-slate-600">{link.icon}</span>
              <span>{link.label}</span><span className="ml-auto text-slate-300">›</span>
            </Link>)}
          </nav>
        </section>)}
        <div className="mx-3 mt-auto rounded-2xl bg-slate-900 p-4 text-white">
          <p className="text-xs font-bold">Administrator access</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-300">Protected by your existing TradeBridge admin role and database policies.</p>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[.16em] text-slate-400">TradeBridge / Administration</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-800">Marketplace operations</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 md:inline-flex">● Live database sync</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800">{(admin.full_name || "A").slice(0,1).toUpperCase()}</div>
            <div className="hidden sm:block"><p className="text-sm font-bold text-slate-900">{admin.full_name || "Administrator"}</p><p className="text-xs text-slate-500">Platform administrator</p></div>
          </div>
        </header>
        <main className="admin-content">{children}</main>
        <footer className="px-6 pb-6 text-center text-[11px] text-slate-400">TradeBridge Control Center · Rwanda · Secure administration</footer>
      </div>
    </div>
  );
}
