"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2 } from "lucide-react";
import { apiRunPipeline } from "@/lib/api";

export function RunButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const onRun = async () => {
    setError(null);
    setRunning(true);
    try {
      await apiRunPipeline();
      startTransition(() => {
        router.refresh();
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "run failed");
    } finally {
      setRunning(false);
    }
  };

  const busy = running || pending;

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-[11px] text-[var(--risk-high)]">{error}</span>
      )}
      <button
        onClick={onRun}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-[11.5px] font-medium text-white hover:bg-[var(--accent-soft)] disabled:opacity-60"
      >
        {busy ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Play size={12} />
        )}
        {busy ? "Running…" : "Run pipeline"}
      </button>
    </div>
  );
}
