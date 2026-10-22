import { statusLabel } from "@/lib/format";

const COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  new: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-blue-100 text-blue-800",
  out_for_delivery: "bg-indigo-100 text-indigo-800",
  ready: "bg-indigo-100 text-indigo-800",
  suspended: "bg-red-100 text-red-800",
  cancelled: "bg-red-100 text-red-800",
  admin: "bg-purple-100 text-purple-800",
  seller: "bg-sky-100 text-sky-800",
  buyer: "bg-gray-100 text-gray-800",
};

export default function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        COLORS[value] ?? "bg-gray-100 text-gray-800"
      }`}
    >
      {statusLabel(value)}
    </span>
  );
}
