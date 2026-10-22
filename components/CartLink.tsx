"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartCount, readCart } from "@/lib/cart";

export default function CartLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(cartCount(readCart()));
    update();
    window.addEventListener("cart-changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("cart-changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return (
    <Link href="/cart" className="relative rounded-lg px-2 py-1 font-medium text-gray-700 hover:text-brand-600">
      🛒 Cart
      {count > 0 && (
        <span className="absolute -right-1 -top-1 rounded-full bg-sun-500 px-1.5 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
