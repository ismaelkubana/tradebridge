import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRWF } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const fallbackSummary = [
    { label: "Completed sales", value: "0", tone: "orange", helper: "Orders marked complete" },
    { label: "Gross revenue", value: formatRWF(0), tone: "green", helper: "Across completed orders" },
    { label: "Average basket", value: formatRWF(0), tone: "blue", helper: "Per completed order" },
    { label: "Pending commission", value: formatRWF(0), tone: "purple", helper: "Due seller payouts" },
  ];

  let completedOrders: Array<{ id: string; total_rwf: number; created_at: string; status: string; shops?: { name: string | null } | null; profiles?: { full_name: string | null } | null }> = [];
  let allCompletedRevenue: Array<{ total_rwf: number | null }> = [];
  let newestOrders: typeof completedOrders = [];
  let commissionRows: Array<{ status: string; commission_amount_rwf: number | null }> = [];

  try {
    const [completedRes, revenueRes, newestRes, commissionRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id,total_rwf,created_at,status,shops(name),profiles(full_name)")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("orders").select("total_rwf").eq("status", "completed"),
      supabase
        .from("orders")
        .select("id,total_rwf,created_at,status,shops(name),profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.from("seller_commissions").select("status, commission_amount_rwf").order("created_at", { ascending: false }).limit(100),
    ]);

    if (!completedRes.error) completedOrders = (completedRes.data ?? []) as typeof completedOrders;
    if (!revenueRes.error) allCompletedRevenue = (revenueRes.data ?? []) as typeof allCompletedRevenue;
    if (!newestRes.error) newestOrders = (newestRes.data ?? []) as typeof newestOrders;
    if (!commissionRes.error) commissionRows = (commissionRes.data ?? []) as typeof commissionRows;
  } catch {
    // Safe fallback when a migration has not been applied yet.
  }

  const salesVolume = allCompletedRevenue.reduce((sum, row) => sum + (row.total_rwf ?? 0), 0);
  const averageOrder = completedOrders.length ? Math.round(salesVolume / completedOrders.length) : 0;
  const pendingCommissions = commissionRows
    .filter((row) => row.status === "due")
    .reduce((sum, row) => sum + (row.commission_amount_rwf ?? 0), 0);

  const summary = [
    { label: "Completed sales", value: completedOrders.length.toLocaleString(), tone: "orange", helper: "Orders marked complete" },
    { label: "Gross revenue", value: formatRWF(salesVolume), tone: "green", helper: "Across completed orders" },
    { label: "Average basket", value: formatRWF(averageOrder), tone: "blue", helper: "Per completed order" },
    { label: "Pending commission", value: formatRWF(pendingCommissions), tone: "purple", helper: "Due seller payouts" },
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
        {(summary.length ? summary : fallbackSummary).map((item) => (
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
                {(newestOrders.length ? newestOrders : []).map((order) => (
                  <tr key={order.id}>
                    <td><strong>#{order.id.slice(0, 8)}</strong></td>
                    <td>{order.shops?.name ?? "—"}</td>
                    <td>{order.profiles?.full_name ?? "—"}</td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>{formatRWF(order.total_rwf)}</td>
                    <td><StatusBadge value={order.status} /></td>
                  </tr>
                ))}
                {!newestOrders.length && (
                  <tr>
                    <td colSpan={6} className="admin-empty">No orders yet.</td>
                  </tr>
                )}
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
              {
                label: "Business approvals",
                value: completedOrders.length ? "Orders are flowing through the marketplace" : "Pending review",
              },
              {
                label: "Order payments",
                value: "Awaiting verification",
              },
              {
                label: "Seller fee submissions",
                value: pendingCommissions ? "Fee review in progress" : "No due seller payouts",
              },
              {
                label: "Marketplace health",
                value: salesVolume > 0 ? "Revenue is tracking above zero" : "No completed revenue yet",
              },
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
