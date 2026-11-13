import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { updatePlatformSetting } from "./actions";

export const dynamic = "force-dynamic";

const defaultSettings = [
  { key: "marketplace_live", label: "Marketplace live", description: "Public storefront and listings remain visible to buyers.", value: true },
  { key: "pending_review_alerts", label: "Review alerts", description: "Email and in-app reminders for pending businesses and payments.", value: true },
  { key: "seller_fee_checks", label: "Seller fee enforcement", description: "Require payment verification before sellers can publish listings.", value: true },
  { key: "manual_order_confirmation", label: "Manual order confirmation", description: "Admin verification required before order confirmation for high-value orders.", value: false },
];

export default async function SettingsPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  let settings = defaultSettings;
  try {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("key, value, description")
      .order("key", { ascending: true });

    if (!error && data) {
      const map = new Map(data.map((row) => [row.key, row]));
      settings = defaultSettings.map((item) => {
        const row = map.get(item.key);
        if (!row) return item;
        return {
          ...item,
          value: Boolean(row.value),
          description: row.description || item.description,
        };
      });
    }
  } catch {
    // Migration may not have run yet; keep the safe fallback defaults.
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

      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h2>Platform controls</h2>
            <p>Admin-configured operational toggles for TradeBridge.</p>
          </div>
        </div>

        <form action={updatePlatformSetting} className="admin-settings-list">
          {settings.map((item) => (
            <div className="admin-setting-row" key={item.key}>
              <div>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </div>
              <label className="admin-switch" aria-label={item.label}>
                <input type="checkbox" name={item.key} defaultChecked={Boolean(item.value)} />
                <span className="admin-slider" />
              </label>
            </div>
          ))}
          <div className="admin-panel-head" style={{ borderBottom: 0, paddingBottom: 0 }}>
            <button type="submit" className="btn">Save settings</button>
          </div>
        </form>
      </section>
    </div>
  );
}
