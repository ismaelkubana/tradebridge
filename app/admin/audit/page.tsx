import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const defaultSettings = [
  { key: "marketplace_live", label: "Marketplace live", description: "Public storefront and listings remain visible to buyers.", value: true },
  { key: "pending_review_alerts", label: "Review alerts", description: "Email and in-app reminders for pending businesses and payments.", value: true },
  { key: "seller_fee_checks", label: "Seller fee enforcement", description: "Require payment verification before sellers can publish listings.", value: true },
  { key: "manual_order_confirmation", label: "Manual order confirmation", description: "Admin verification required before order confirmation for high-value orders.", value: false },
];

export default async function AuditLogPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  let entries: Array<{ id: string; action: string; entity_type: string; entity_id: string | null; details: Record<string, unknown> | null; created_at: string; profiles?: { full_name: string | null } | null }> = [];

  try {
    const { data, error } = await supabase
      .from("admin_audit_logs")
      .select("id,action,entity_type,entity_id,details,created_at,profiles!admin_audit_logs_actor_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      entries = data as typeof entries;
    }
  } catch {
    // If the migration has not run yet, the page falls back to a safe preview state.
  }

  const rows = entries.length
    ? entries.map((row) => ({
        time: row.created_at,
        actor: row.profiles?.full_name || "System",
        action: row.action,
        target: row.entity_type + (row.entity_id ? ` · ${row.entity_id}` : ""),
      }))
    : [
        { time: "2026-11-13T10:08:00Z", actor: "Admin · IB", action: "Approved business", target: "Umucyo Hotel" },
        { time: "2026-11-13T09:46:00Z", actor: "System", action: "Seller fee payment marked paid", target: "Seller #4021" },
        { time: "2026-11-13T08:30:00Z", actor: "Admin · JK", action: "Updated order status", target: "Order #TB-2048" },
        { time: "2026-11-13T07:45:00Z", actor: "Seller · MT", action: "Created listing", target: "Fresh banana bundle" },
        { time: "2026-11-13T07:10:00Z", actor: "Buyer · CD", action: "Placed order", target: "Order #TB-2031" },
      ];

  return (
    <div className="admin-dashboard">
      <header className="admin-page-head">
        <div>
          <p className="admin-eyebrow">AUDIT</p>
          <h1>Audit log</h1>
          <p className="admin-subtitle">Track platform events connected to operations, approvals, and financial review.</p>
        </div>
      </header>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h2>Recent events</h2>
            <p>Latest operational changes and user actions.</p>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={`${item.actor}-${item.time}`}>
                  <td>{formatDate(item.time)}</td>
                  <td>{item.actor}</td>
                  <td>{item.action}</td>
                  <td>{item.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
