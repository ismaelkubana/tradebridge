import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendPasswordReset, setUserRole } from "../actions";
import StatusBadge from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

const TABS = [
  { label: "All", value: undefined },
  { label: "Buyers", value: "buyer" },
  { label: "Sellers", value: "seller" },
  { label: "Admins", value: "admin" },
];

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string; success?: string; error?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const me = await requireRole(["admin"]);
  const filter = ["buyer", "seller", "admin"].includes(resolvedSearchParams.role ?? "") ? resolvedSearchParams.role : undefined;
  const q = (resolvedSearchParams.q ?? "").replace(/[%,()]/g, " ").trim();

  const supabase = await createClient();
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (filter) query = query.eq("role", filter);
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data } = await query;
  const users = (data as Profile[]) ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>

      {resolvedSearchParams.success && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{resolvedSearchParams.success}</p>}
      {resolvedSearchParams.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{resolvedSearchParams.error}</p>}

      <section className="card space-y-3">
        <h2 className="font-semibold">Send password-reset email</h2>
        <p className="text-sm text-gray-600">Enter the account email. The customer will receive a link to set a new password on the public TradeBridge website.</p>
        <form action={sendPasswordReset} className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="reset-account-email">Account email</label>
          <input id="reset-account-email" name="email" type="email" required maxLength={254} autoComplete="email" placeholder="customer@example.com" className="input min-w-64 flex-1" />
          <button type="submit" className="btn">Send reset link</button>
        </form>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-sm">
          {TABS.map((t) => (
            <Link
              key={t.label}
              href={t.value ? `/admin/users?role=${t.value}` : "/admin/users"}
              className={`rounded-full px-3 py-1 ${filter === t.value ? "bg-brand-600 text-white" : "bg-white ring-1 ring-gray-300"}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          {filter && <input type="hidden" name="role" value={filter} />}
          <input name="q" defaultValue={q} placeholder="Search name or phone" className="input !w-56" />
          <button className="btn btn-sm" type="submit">Search</button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Name</th>
              <th className="th">Phone</th>
              <th className="th">Role</th>
              <th className="th">Joined</th>
              <th className="th">Change role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="td font-medium">{u.full_name || "—"}</td>
                <td className="td">{u.phone || "—"}</td>
                <td className="td"><StatusBadge value={u.role} /></td>
                <td className="td">{formatDate(u.created_at)}</td>
                <td className="td">
                  {u.id === me.id ? (
                    <span className="text-xs text-gray-400">You</span>
                  ) : (
                    <form action={setUserRole} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={u.id} />
                      <select name="role" defaultValue={u.role} className="input !w-auto !py-1">
                        <option value="buyer">Buyer</option>
                        <option value="seller">Seller</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button className="btn-outline btn-sm" type="submit">Save</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
