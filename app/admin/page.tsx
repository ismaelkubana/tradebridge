import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRWF } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const adminLinks = [
  { href: "/admin/shops?status=pending", label: "Review businesses", icon: "▦" },
  { href: "/admin/payments", label: "Verify order payments", icon: "＄" },
  { href: "/admin/billing", label: "Review seller fees", icon: "◷" },
  { href: "/admin/users", label: "Manage accounts", icon: "♙" },
];

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const count = async (table: string, filter?: [string, string]) => {
    let query = supabase.from(table).select("id", { count: "exact", head: true });
    if (filter) query = query.eq(filter[0], filter[1]);
    const { count: result } = await query;
    return result ?? 0;
  };

  const [users, sellers, approvedShops, pendingShops, orders, pendingOrderPayments, pendingSellerFees, { data: completed }, { data: recentOrders }, { data: applications }] = await Promise.all([
    count("profiles"),
    count("profiles", ["role", "seller"]),
    count("shops", ["status", "approved"]),
    count("shops", ["status", "pending"]),
    count("orders"),
    count("order_payments", ["status", "pending"]),
    count("seller_fee_payments", ["status", "pending"]),
    supabase.from("orders").select("total_rwf").eq("status", "completed").order("created_at", { ascending: false }).limit(200),
    supabase.from("orders").select("id,status,total_rwf,created_at,shops(name),profiles(full_name)").order("created_at", { ascending: false }).limit(6),
    supabase.from("shops").select("id,name,type,district,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(5),
  ]);

  const recentVolume = (completed ?? []).reduce((sum, order) => sum + (order.total_rwf ?? 0), 0);
  const attentionCount = pendingShops + pendingOrderPayments + pendingSellerFees;
  const stats = [
    { label: "Total users", value: users.toLocaleString(), detail: `${sellers.toLocaleString()} seller accounts`, icon: "♙", tone: "orange" },
    { label: "Approved businesses", value: approvedShops.toLocaleString(), detail: `${pendingShops} awaiting review`, icon: "▦", tone: "green" },
    { label: "Marketplace orders", value: orders.toLocaleString(), detail: "All recorded orders", icon: "▤", tone: "blue" },
    { label: "Completed sales volume", value: formatRWF(recentVolume), detail: "Latest 200 completed orders", icon: "＄", tone: "purple" },
  ];

  return (
    <div className="admin-dashboard">
      <header className="admin-page-head">
        <div>
          <p className="admin-eyebrow">PLATFORM OVERVIEW</p>
          <h1>Admin dashboard</h1>
          <p className="admin-subtitle">Manage TradeBridge marketplace activity, accounts, and seller payments.</p>
        </div>
        <span className="admin-system-status"><i /> Platform data connected</span>
      </header>

      {attentionCount > 0 && (
        <Link href={pendingShops ? "/admin/shops?status=pending" : pendingOrderPayments ? "/admin/payments" : "/admin/billing"} className="admin-notice">
          <span className="admin-notice-icon">!</span>
          <span><strong>{attentionCount} items need your attention</strong><small>{pendingShops} business applications · {pendingOrderPayments} order payments · {pendingSellerFees} seller fees</small></span>
          <span className="admin-notice-action">Review queue →</span>
        </Link>
      )}

      <section className="admin-stats-grid" aria-label="Marketplace summary">
        {stats.map((stat) => (
          <article className="admin-stat-card" key={stat.label}>
            <div className="admin-stat-top"><span>{stat.label}</span><span className={`admin-stat-icon ${stat.tone}`} aria-hidden="true">{stat.icon}</span></div>
            <strong>{stat.value}</strong>
            <small>{stat.detail}</small>
          </article>
        ))}
      </section>

      <div className="admin-dashboard-columns">
        <section className="admin-panel">
          <div className="admin-panel-head"><div><h2>Business applications</h2><p>Review sellers before their shops go live.</p></div><Link href="/admin/shops?status=pending">View all →</Link></div>
          {applications?.length ? <div className="admin-activity-list">{applications.map((shop) => (
            <Link href="/admin/shops?status=pending" className="admin-activity-row" key={shop.id}>
              <span className="admin-row-icon">▦</span><span className="admin-row-main"><strong>{shop.name}</strong><small>{shop.type} · {shop.district || "Location not provided"} · applied {formatDate(shop.created_at)}</small></span><StatusBadge value="pending" />
            </Link>
          ))}</div> : <p className="admin-empty">No business applications waiting for review.</p>}
        </section>

        <section className="admin-panel">
          <div className="admin-panel-head"><div><h2>Admin shortcuts</h2><p>Jump to common platform tasks.</p></div></div>
          <div className="admin-shortcuts">{adminLinks.map((item) => <Link href={item.href} key={item.href}><span>{item.icon}</span>{item.label}<b>→</b></Link>)}</div>
        </section>
      </div>

      <section className="admin-panel admin-recent-panel">
        <div className="admin-panel-head"><div><h2>Recent orders</h2><p>Latest activity across the marketplace.</p></div><Link href="/admin/orders">View all orders →</Link></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Business</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody>
          {recentOrders?.length ? recentOrders.map((order) => <tr key={order.id}>
            <td><strong>#{order.id.slice(0, 8)}</strong></td><td>{order.shops?.name ?? "—"}</td><td>{order.profiles?.full_name || "—"}</td><td>{formatDate(order.created_at)}</td><td>{formatRWF(order.total_rwf)}</td><td><StatusBadge value={order.status} /></td>
          </tr>) : <tr><td className="admin-empty" colSpan={6}>No orders yet.</td></tr>}
        </tbody></table></div>
      </section>
      <p className="admin-footnote">Sales volume is calculated from the latest 200 completed orders. Verify payment references against provider records before approving them.</p>
    </div>
  );
}
