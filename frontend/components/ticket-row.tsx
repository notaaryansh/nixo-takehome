import Link from "next/link";
import { MessageSquare, ChevronRight } from "lucide-react";
import type { Ticket } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";
import { SeverityPill } from "./severity-pill";
import { StatusPill } from "./status-pill";
import { TypePill } from "./type-pill";

export function TicketRow({ ticket }: { ticket: Ticket }) {
  const ageDisplay =
    ticket.ageHours >= 24
      ? `${Math.floor(ticket.ageHours / 24)}d old`
      : `${ticket.ageHours}h old`;

  const stripeVar: Record<typeof ticket.severity, string> = {
    high: "var(--severity-high)",
    medium: "var(--severity-medium)",
    low: "var(--severity-low)",
  };
  const stripeColor =
    ticket.status === "resolved"
      ? "var(--risk-low)"
      : stripeVar[ticket.severity];

  return (
    <Link
      href={`/customers/${ticket.customerId}/tickets/${ticket.id}`}
      style={{ boxShadow: `inset 3px 0 0 0 ${stripeColor}` }}
      className="group grid grid-cols-[1fr_120px_160px_72px_120px_18px] items-center gap-4 cursor-pointer rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
    >
      {/* col 1 — title + summary */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-[13px] font-medium text-[var(--text)]">
            {ticket.title}
          </h4>
          <TypePill type={ticket.type} />
        </div>
        <p className="mt-1 line-clamp-1 text-[11.5px] leading-relaxed text-[var(--text-muted)]">
          {ticket.summary}
        </p>
      </div>

      {/* col 2 — severity */}
      <div className="flex justify-start">
        <SeverityPill severity={ticket.severity} />
      </div>

      {/* col 3 — status */}
      <div className="flex justify-start">
        <StatusPill status={ticket.status} />
      </div>

      {/* col 4 — message count */}
      <div className="flex items-center gap-1 text-[10.5px] text-[var(--text-dim)]">
        <MessageSquare size={10.5} />
        <span>
          {ticket.messages.length}{" "}
          {ticket.messages.length === 1 ? "msg" : "msgs"}
        </span>
      </div>

      {/* col 5 — age + updated */}
      <div className="flex flex-col text-right text-[10.5px] text-[var(--text-dim)]">
        <span>{ageDisplay}</span>
        <span>updated {formatRelativeTime(ticket.updatedAt)}</span>
      </div>

      {/* col 6 — chevron */}
      <ChevronRight
        size={14}
        className="shrink-0 text-[var(--text-dim)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text-muted)]"
      />
    </Link>
  );
}
