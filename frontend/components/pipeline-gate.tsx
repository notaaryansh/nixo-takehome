"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiRunPipeline } from "@/lib/api";

/**
 * Fires POST /pipeline/run once on mount IF `shouldRun` is true (typically
 * only when the backend has no events yet) and shows a spinner in place of
 * `children` while the pipeline is in flight. After the run completes,
 * triggers `router.refresh()` so the server component re-fetches the new
 * events / risks / features.
 *
 * When `shouldRun` is false, renders `children` immediately — no extra LLM
 * calls; polling alone keeps the data fresh.
 */
export function PipelineGate({
  children,
  shouldRun,
}: {
  children: React.ReactNode;
  shouldRun: boolean;
}) {
  const router = useRouter();
  const fired = useRef(false);
  const [running, setRunning] = useState(shouldRun);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldRun) return;
    if (fired.current) return;
    fired.current = true;

    apiRunPipeline()
      .then(() => router.refresh())
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      })
      .finally(() => setRunning(false));
  }, [router, shouldRun]);

  if (running) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]">
        <Loader2 size={20} className="animate-spin text-[var(--accent)]" />
        <span className="text-[12.5px] text-[var(--text)]">
          Running pipeline…
        </span>
        <span className="text-[10.5px] text-[var(--text-dim)]">
          Extracting events, scoring features, computing risk
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <div className="mb-3 rounded-md border border-[var(--risk-high)]/40 bg-[var(--risk-high-bg)] px-3 py-2 text-[11.5px] text-[var(--risk-high)]">
          Pipeline run failed: {error}
        </div>
        {children}
      </>
    );
  }

  return <>{children}</>;
}
