import { createClient } from "@/lib/supabase/server";
import { savePlatformSettings } from "./actions";

export const dynamic = "force-dynamic";

const defaults = [
  { key: "marketplace_live", title: "Marketplace availability", description: "Controls the marketplace availability flag for storefront integrations.", value: true },
  { key: "pending_review_alerts", title: "Review queue alerts", description: "Display attention notices for pending business and payment reviews.", value: true },
  { key: "seller_fee_checks", title: "Seller fee enforcement", description: "Keep the seller registration payment requirement enabled.", value: true },
  { key: "manual_order_confirmation", title: "Manual order confirmation", description: "Enable an additional review step for order confirmation workflows.", value: false },
];

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("key,value");
  const values = new Map((data ?? []).map((row) => [row.key, row.value]));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Platform configuration</p>
        <h2 className="mt-1 text-2xl font-bold text-gray-950">System settings</h2>
        <p className="mt-1 text-sm text-gray-500">Manage operational switches stored centrally in Supabase.</p>
      </header>

      {params.success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{params.success}</p>}
      {params.error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{params.error}</p>}

      <form action={savePlatformSettings} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="font-bold text-gray-950">Marketplace controls</h3>
          <p className="mt-1 text-xs text-gray-500">Changes are saved to the production platform_settings table.</p>
        </div>
        <div className="divide-y divide-gray-100 px-5">
          {defaults.map((item) => {
            const stored = values.get(item.key);
            const checked = typeof stored === "boolean" ? stored : item.value;
            return (
              <label key={item.key} className="flex cursor-pointer items-center justify-between gap-5 py-5">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900">{item.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-gray-500">{item.description}</span>
                </span>
                <span className="shrink-0">
                  <input className="h-5 w-5 accent-emerald-600" type="checkbox" name={item.key} defaultChecked={checked} />
                </span>
              </label>
            );
          })}
        </div>
        <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-5 py-4">
          <button className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800" type="submit">Save settings</button>
        </div>
      </form>
      <p className="text-xs leading-5 text-gray-400">Financial defaults such as the 5% commission, 14-day trial and RWF 5,000 seller fee are stored as reference settings. Their existing checkout and billing rules are not changed by this screen.</p>
    </div>
  );
}
