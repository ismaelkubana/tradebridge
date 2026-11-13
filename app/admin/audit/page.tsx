import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const auditItems = [
  { time: "2026-11-13T10:08:00Z", actor: "Admin · IB", action: "Approved business", target: "Umucyo Hotel" },
  { time: "2026-11-13T09:46:00Z", actor: "System", action: "Seller fee payment marked paid", target: "Seller #4021" },
  { time: "2026-11-13T08:30:00Z", actor: "Admin · JK", action: "Updated order status", target: "Order #TB-2048" },
  { time: "2026-11-13T07:45:00Z", actor: "Seller · MT", action: "Created listing", target: "Fresh banana bundle" },
  { time: "2026-11-13T07:10:00Z", actor: "Buyer · CD", action: "Placed order", target: "Order #TB-2031" },
];

export default function AuditLogPage() {
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
              {auditItems.map((item) => (
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
