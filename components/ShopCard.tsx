import Link from "next/link";
import { SHOP_TYPE_LABEL, type Shop } from "@/lib/types";

const ICON: Record<string, string> = { shop: "▦", restaurant: "✳", salon: "✦" };
const TINT: Record<string, string> = {
  shop: "from-blue-50 via-indigo-50 to-white text-blue-700",
  restaurant: "from-orange-50 via-amber-50 to-white text-orange-700",
  salon: "from-fuchsia-50 via-pink-50 to-white text-fuchsia-700",
};

export default function ShopCard({ shop }: { shop: Shop }) {
  return (
    <Link href={`/shops/${shop.id}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-slate-900/[0.07]">
      <div className={`relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br ${TINT[shop.type] ?? TINT.shop}`}>
        <span className="absolute -right-5 -top-8 h-32 w-32 rounded-full border border-current/10 transition duration-500 group-hover:scale-110" />
        <span className="absolute -bottom-12 -left-5 h-28 w-28 rounded-full border border-current/10" />
        <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-white/90 text-3xl shadow-sm ring-1 ring-black/5 transition duration-300 group-hover:scale-105">{ICON[shop.type] ?? "▦"}</span>
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800 shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Approved</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2"><h3 className="line-clamp-1 text-base font-extrabold tracking-tight text-slate-900 transition group-hover:text-brand-700">{shop.name}</h3><span className="shrink-0 text-lg text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-700" aria-hidden="true">↗</span></div>
        <p className="mt-1.5 text-xs font-semibold text-slate-500">{SHOP_TYPE_LABEL[shop.type]}{shop.district ? ` · ${shop.district}` : ""}</p>
        <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">{shop.description || "Discover this local business on TradeBridge."}</p>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-brand-700"><span>Visit business</span><span aria-hidden="true">→</span></div>
      </div>
    </Link>
  );
}
