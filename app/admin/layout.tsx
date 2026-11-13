import Link from "next/link";
import { requireRole } from "@/lib/auth";
import AdminNavigation from "./AdminNavigation";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["admin"]);

  return (
    <div className="admin-shell">
      <AdminNavigation />
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            <Link href="/">TradeBridge</Link>
            <span>/</span>
            <strong>Admin workspace</strong>
          </div>
          <div className="admin-topbar-right">
            <span className="admin-connection"><i /> Supabase connected</span>
            <span className="admin-topbar-avatar">SA</span>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
