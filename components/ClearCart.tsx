"use client";

import { useEffect } from "react";
import { writeCart } from "@/lib/cart";

// Empties the browser cart after an order has been placed.
export default function ClearCart() {
  useEffect(() => {
    writeCart(null);
  }, []);
  return null;
}
