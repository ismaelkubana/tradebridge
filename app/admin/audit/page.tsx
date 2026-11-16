import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type AuditRow = {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function describe(row: AuditRow) {
  const details = row.details ?? {};
  if (row.entity_type === "shops" && details.status_after) return `Business status changed to ${String(details.status_after)}`;
  if (row.entity_type === "profiles" && details.role_after) return `Account role changed to ${String(details.role_after)}`;
  if (row.entity_type === "orders" && details.status_after) return `Order status changed to ${String(details.status_after)}`;
  if ((row.entity_type === "order_payments" || row.entity_type === "seller_fee_payments") && details.status_after) return `Payment status changed to ${String(details.status_after)}`;
  if (row.entity_type === "listings" && details.active_after !== undefined) return `Listing visibility set to ${String(details.active_after)}`;
  if (row.entity_type === "platform_settings") return `Platform setting updated: ${String(details.setting_key ?? "configuration")}`;
  return `${label(row.action)} · ${label(row.entity_type)}`;
}

export default async function AdminAuditPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("id,action,entity_type,entity_id,details,created_at,profiles!admin_audit_logs_actor_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as unknown as AuditRow[];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Governance & accountability</p>
          <h2 className="mt-1 text-2xl font-bold text-gray-950">Activity audit log</h2>
          <p className="mt-1 text-sm text-gray-500">A chronological record of marketplace and administration changes.</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Live updates enabled</span>
      </header>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Audit history could not be loaded. Confirm your administrator role and database migration.
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div><h3 className="font-bold text-gray-950">Recent system events</h3><p className="text-xs text-gray-500">Showing the latest {rows.length} events (maximum 100).</p></div>
            <span className="text-xs font-medium text-gray-500">Newest first</span>
          </div>
          {rows.length ? (
            <div className="divide-y divide-gray-100">
              {rows.map((row) => (
                <article key={row.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700">
                    {row.action === "delete" ? "×" : row.action === "insert" ? "+" : "↻"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{describe(row)}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {row.profiles?.full_name || "System / external workflow"} · {label(row.entity_type)}
                      {row.entity_id ? ` · Ref ${row.entity_id.slice(0, 8)}` : ""}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-gray-400">{formatDate(row.created_at)}</time>
                </article>
              ))}
            </div>
          ) : <p className="px-5 py-10 text-center text-sm text-gray-500">No changes have been recorded yet.</p>}
        </section>
      )}
      <p className="text-xs leading-5 text-gray-400">The audit trail intentionally excludes customer contact details, addresses, transaction references and payment credentials.</p>
    </div>
  );
}
