import type { TicketStatus } from "@/lib/types";
import { statusLabel } from "@/lib/format";

const styles: Record<
  TicketStatus,
  { fg: string; bg: string; dot: string }
> = {
  needs_reply: {
    fg: "text-[var(--risk-high)]",
    bg: "bg-[var(--risk-high-bg)]",
    dot: "bg-[var(--risk-high)]",
  },
  active: {
    fg: "text-[#7AB0F5]",
    bg: "bg-[#3B82F61F]",
    dot: "bg-[#3B82F6]",
  },
  waiting_customer: {
    fg: "text-[var(--risk-med)]",
    bg: "bg-[var(--risk-med-bg)]",
    dot: "bg-[var(--risk-med)]",
  },
  resolved: {
    fg: "text-[var(--risk-low)]",
    bg: "bg-[var(--risk-low-bg)]",
    dot: "bg-[var(--risk-low)]",
  },
};

export function StatusPill({ status }: { status: TicketStatus }) {
  const s = styles[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-medium ${s.bg} ${s.fg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {statusLabel[status]}
    </span>
  );
}

export const statusDotClass = (status: TicketStatus) => styles[status].dot;
export const statusFgClass = (status: TicketStatus) => styles[status].fg;
