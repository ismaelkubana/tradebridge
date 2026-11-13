"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const groups = [
  { label: "OVERVIEW", links: [{ href: "/admin", label: "Dashboard", icon: "⌂" }] },
  { label: "MARKETPLACE", links: [
    { href: "/admin/shops", label: "Businesses", icon: "▦" },
    { href: "/admin/users", label: "User management", icon: "♙" },
    { href: "/admin/orders", label: "All orders", icon: "▤" },
  ] },
  { label: "FINANCIAL OPERATIONS", links: [
    { href: "/admin/payments", label: "Order payments", icon: "＄" },
    { href: "/admin/billing", label: "Seller payments", icon: "◷" },
  ] },
  { label: "REPORTS & SYSTEM", links: [
    { href: "/admin/analytics", label: "Analytics & reports", icon: "▥" },
    { href: "/admin/audit", label: "Audit log", icon: "≋" },
    { href: "/admin/settings", label: "System settings", icon: "⚙" },
  ] },
];

export default function AdminNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="admin-mobile-menu" type="button" aria-expanded={open} aria-controls="admin-sidebar" onClick={() => setOpen(!open)}>
        <span aria-hidden="true">☰</span>
        <span className="sr-only">{open ? "Close" : "Open"} admin navigation</span>
      </button>
      {open && <button className="admin-mobile-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <aside id="admin-sidebar" className={`admin-sidebar ${open ? "is-open" : ""}`}>
        <Link href="/admin" className="admin-brand" onClick={() => setOpen(false)}>
          <span className="admin-brand-mark" aria-hidden="true">T</span>
          <span>
            <strong>TradeBridge</strong>
            <small>ADMIN CONSOLE</small>
          </span>
        </Link>

        <nav aria-label="Admin navigation">
          {groups.map((group) => (
            <div className="admin-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.links.map((item) => {
                const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`admin-nav-link ${active ? "active" : ""}`}
                  >
                    <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <span className="admin-avatar">SA</span>
          <span>
            <strong>Platform admin</strong>
            <small>Authorized access</small>
          </span>
        </div>
      </aside>
    </>
  );
}
