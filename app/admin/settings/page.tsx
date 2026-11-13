export const dynamic = "force-dynamic";

const settings = [
  { key: "marketplace-live", label: "Marketplace live", description: "Public storefront and listings remain visible to buyers.", value: true },
  { key: "pending-review-alerts", label: "Review alerts", description: "Email and in-app reminders for pending businesses and payments.", value: true },
  { key: "seller-fee-checks", label: "Seller fee enforcement", description: "Require payment verification before sellers can publish listings.", value: true },
  { key: "order-confirmation", label: "Manual order confirmation", description: "Admin verification required before order confirmation for high-value orders.", value: false },
];

export default function SettingsPage() {
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
            <p>UI-ready settings for the TradeBridge admin workflow.</p>
          </div>
        </div>
        <div className="admin-settings-list">
          {settings.map((item) => (
            <div className="admin-setting-row" key={item.key}>
              <div>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </div>
              <label className="admin-switch" aria-label={item.label}>
                <input type="checkbox" defaultChecked={item.value} />
                <span className="admin-slider" />
              </label>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
