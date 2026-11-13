import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRWF } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const [{ data: completed }, { data: revenue }, { data: newestOrders }] = await Promise.all([
    supabase.from("orders").select("id,total_rwf,created_at,status").eq("status", "completed").order("created_at", { ascending: false }).limit(100),
    supabase.from("orders").select("total_rwf").eq("status", "completed"),
    supabase.from("orders").select("id,total_rwf,created_at,status,shops(name),profiles(full_name)").order("created_at", { ascending: false }).limit(8),
  ]);

  const completedOrders = completed ?? [];
  const salesVolume = (revenue ?? []).reduce((sum, row) => sum + (row.total_rwf ?? 0), 0);
  const avgOrder = completedOrders.length ? Math.round(salesVolume / completedOrders.length) : 0;

  const summary = [
    { label: "Completed sales", value: completedOrders.length.toLocaleString(), tone: "orange", helper: "Orders marked complete" },
    { label: "Gross revenue", value: formatRWF(salesVolume), tone: "green", helper: "Across completed orders" },
    { label: "Average basket", value: formatRWF(avgOrder), tone: "blue", helper: "Per completed order" },
    { label: "Recent activity", value: (newestOrders ?? []).length.toLocaleString(), tone: "purple", helper: "Orders in the last 7 days" },
  ];

  return (
    <div className="admin-dashboard">
      <header className="admin-page-head">
        <div>
          <p className="admin-eyebrow">INSIGHTS</p>
          <h1>Analytics & reports</h1>
          <p className="admin-subtitle">Track sales performance, order movement, and marketplace health.</p>
        </div>
      </header>

      <section className="admin-stats-grid">
        {summary.map((item) => (
          <article className="admin-stat-card" key={item.label}>
            <div className="admin-stat-top">
              <span>{item.label}</span>
              <span className={`admin-stat-icon ${item.tone}`} aria-hidden="true">▣</span>
            </div>
            <strong>{item.value}</strong>
            <small>{item.helper}</small>
          </article>
        ))}
      </section>

      <div className="admin-dashboard-columns">
        <section className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h2>Recent order performance</h2>
              <p>Latest completed transactions and order status movement.</p>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Business</th>
                  <th>Buyer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(newestOrders ?? []).map((order) => (
                  <tr key={order.id}>
                    <td><strong>#{order.id.slice(0, 8)}</strong></td>
                    <td>{order.shops?.name ?? "—"}</td>
                    <td>{order.profiles?.full_name ?? "—"}</td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>{formatRWF(order.total_rwf)}</td>
                    <td><StatusBadge value={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h2>Operational snapshot</h2>
              <p>What needs active attention today.</p>
            </div>
          </div>
          <div className="admin-activity-list">
            {[
              { label: "Business approvals", value: "Pending review" },
              { label: "Order payments", value: "Awaiting verification" },
              { label: "Seller fee submissions", value: "Require admin review" },
              { label: "Customer orders", value: "Live across all categories" },
            ].map((item) => (
              <div className="admin-activity-row" key={item.label}>
                <span className="admin-row-icon">◌</span>
                <span className="admin-row-main">
                  <strong>{item.label}</strong>
                  <small>{item.value}</small>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
