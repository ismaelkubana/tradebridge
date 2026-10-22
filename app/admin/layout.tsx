import Link from "next/link";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["admin"]);

  const links = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/shops", label: "Businesses" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/orders", label: "All orders" },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr]">
      <aside className="space-y-1">
        <div className="card mb-3 !p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Admin portal</p>
          <p className="mt-1 font-semibold">Management</p>
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
