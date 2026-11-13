import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string }>;
}) {
  await requireRole(["admin"]);
  const resolved = searchParams ? await searchParams : {};
  const supabase = await createClient();

  let settings: Array<{ key: string; value: boolean; description: string }> = [
    { key: "marketplace_live", value: true, description: "Public storefront and listings remain visible to buyers." },
    { key: "pending_review_alerts", value: true, description: "Email and in-app reminders for pending businesses and payments." },
    { key: "seller_fee_checks", value: true, description: "Require payment verification before sellers can publish listings." },
    { key: "manual_order_confirmation", value: false, description: "Admin verification required before order confirmation for high-value orders." },
  ];

  try {
    const { data } = await supabase.from("platform_settings").select("key, value, description");
    if (data) {
      const map = new Map(data.map((row) => [row.key, row]));
      settings = settings.map((item) => {
        const row = map.get(item.key);
        return row
          ? { ...item, value: Boolean(row.value), description: String(row.description || item.description) }
          : item;
      });
    }
  } catch {
    // Falls back to defaults until the migration is applied.
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-page-head">
        <div>
          <p className="admin-eyebrow">SYSTEM</p>
          <h1>System settings</h1>
          <p className="admin-subtitle">Configure the operational rules that govern marketplace access and approvals.</p>
        </div>
      </header>

      {resolved.success && (
        <div className="admin-notice" style={{ marginBottom: 12 }}>
          <span className="admin-notice-icon">✓</span>
          <span><strong>{resolved.success}</strong></span>
        </div>
      )}

      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h2>Platform controls</h2>
            <p>Admin-configured operational toggles for TradeBridge.</p>
          </div>
        </div>

        <div className="admin-settings-list">
          {settings.map((item) => (
            <div className="admin-setting-row" key={item.key}>
              <div>
                <strong>{item.key.replace(/_/g, " ")}</strong>
                <small>{item.description}</small>
              </div>
              <label className="admin-switch" aria-label={item.key}>
                <input type="checkbox" checked={Boolean(item.value)} readOnly />
                <span className="admin-slider" />
              </label>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
