"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Drop this into a Server Component page to enable simple polling.
 * Every `intervalMs` we call router.refresh(), which re-runs the server
 * component, refetches its data, and reconciles the tree. No SSE / no
 * websockets — just a periodic re-render.
 */
export function PollRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
