import type { TicketType } from "@/lib/types";

const labels: Record<TicketType, string> = {
  bug: "bug",
  feature_request: "feature",
  question: "question",
};

export function TypePill({ type }: { type: TicketType }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-md bg-[var(--surface)] px-2 py-0.5 font-mono text-[10.5px] text-[var(--text-muted)]">
      #{labels[type]}
    </span>
  );
}
