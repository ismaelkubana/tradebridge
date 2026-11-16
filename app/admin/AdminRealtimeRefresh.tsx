"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const TABLES = [
  "profiles",
  "shops",
  "listings",
  "orders",
  "order_items",
  "order_payments",
  "seller_billing",
  "seller_fee_payments",
  "seller_commissions",
  "site_banners",
  "platform_settings",
  "admin_audit_logs",
];

export default function AdminRealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const supabase = createBrowserClient(url, key);
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase.channel("tradebridge-admin-live");

    for (const table of TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          if (refreshTimer) clearTimeout(refreshTimer);
          refreshTimer = setTimeout(() => router.refresh(), 250);
        }
      );
    }

    channel.subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
