import Link from "next/link";
import { SHOP_TYPE_LABEL, type Shop } from "@/lib/types";

const ICON: Record<string, string> = { shop: "🛍️", restaurant: "🍽️", salon: "💇" };

export default function ShopCard({ shop }: { shop: Shop }) {
  return (
    <Link
      href={`/shops/${shop.id}`}
      className="card block transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-brand-50 text-4xl">
        {ICON[shop.type]}
      </div>
      <h3 className="font-semibold">{shop.name}</h3>
      <p className="mt-1 text-xs text-gray-500">
        {SHOP_TYPE_LABEL[shop.type]}
        {shop.district ? ` · ${shop.district}` : ""}
      </p>
      <p className="mt-2 line-clamp-2 text-sm text-gray-600">{shop.description}</p>
    </Link>
  );
}
