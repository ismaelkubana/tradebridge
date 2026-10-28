import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { setShopStatus } from "../actions";
import StatusBadge from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { SHOP_TYPE_LABEL, type Shop } from "@/lib/types";

export const dynamic = "force-dynamic";

type ShopRow = Shop & { profiles: { full_name: string; phone: string } | null };

const TABS = [
  { label: "All", value: undefined },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Suspended", value: "suspended" },
];

export default async function AdminShopsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const filter = ["pending", "approved", "suspended"].includes(resolvedSearchParams.status ?? "")
    ? resolvedSearchParams.status
    : undefined;

  const supabase = await createClient();
  let query = supabase
    .from("shops")
    .select("*, profiles(full_name, phone)")
    .order("created_at", { ascending: false });
  if (filter) query = query.eq("status", filter);
  const { data } = await query;
  const shops = (data as ShopRow[]) ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Businesses</h1>

      <div className="flex flex-wrap gap-2 text-sm">
        {TABS.map((t) => (
          <Link
            key={t.label}
            href={t.value ? `/admin/shops?status=${t.value}` : "/admin/shops"}
            className={`rounded-full px-3 py-1 ${filter === t.value ? "bg-brand-600 text-white" : "bg-white ring-1 ring-gray-300"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {shops.length === 0 && <p className="text-sm text-gray-500">No businesses in this view.</p>}
        {shops.map((s) => (
          <details key={s.id} className="card group">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="text-xs text-gray-500">
                  {SHOP_TYPE_LABEL[s.type]} · {s.district || "No district"} · applied {formatDate(s.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge value={s.status} />
                <span className="text-xs text-gray-400 group-open:hidden">Details ▾</span>
              </div>
            </summary>

            <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 text-sm text-gray-700">
              <p>{s.description || "No description."}</p>
              <p>
                Owner: <strong>{s.profiles?.full_name || "—"}</strong>
                {s.profiles?.phone && <> · 📞 {s.profiles.phone}</>}
              </p>
              <p>Address: {[s.address, s.district].filter(Boolean).join(", ") || "—"} · Business phone: {s.phone || "—"}</p>

              <div className="flex flex-wrap gap-2 pt-1">
                {s.status !== "approved" && (
                  <form action={setShopStatus}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="status" value="approved" />
                    <button className="btn btn-sm" type="submit">{s.status === "suspended" ? "Reinstate" : "Approve"}</button>
                  </form>
                )}
                {s.status !== "suspended" && (
                  <form action={setShopStatus}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="status" value="suspended" />
                    <button className="btn-danger" type="submit">Suspend</button>
                  </form>
                )}
                {s.status === "approved" && (
                  <Link href={`/shops/${s.id}`} className="btn-outline btn-sm">View public page</Link>
                )}
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
