import Link from "next/link";
import { MessageSquare, Clock, AlertTriangle, ChevronRight } from "lucide-react";
import type { Ticket } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";
import { StatusPill } from "./status-pill";
import { TypePill } from "./type-pill";

const severityDot: Record<Ticket["severity"], string> = {
  high: "bg-[var(--risk-high)]",
  medium: "bg-[var(--risk-med)]",
  low: "bg-[var(--risk-low)]",
};

export function TicketRow({ ticket }: { ticket: Ticket }) {
  const ageDisplay =
    ticket.ageHours >= 24
      ? `${Math.floor(ticket.ageHours / 24)}d old`
      : `${ticket.ageHours}h old`;

  return (
    <Link
      href={`/customers/${ticket.customerId}/tickets/${ticket.id}`}
      className={`group flex cursor-pointer items-start gap-3 rounded-md border bg-[var(--bg-elevated)] px-4 py-3 transition-colors hover:bg-[var(--surface-hover)] ${
        ticket.stalled
          ? "border-[var(--risk-high)]/40"
          : "border-[var(--border)] hover:border-[var(--border-strong)]"
      }`}
    >
      <span
        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${severityDot[ticket.severity]}`}
        title={`${ticket.severity} severity`}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-[13px] font-medium text-[var(--text)]">
            {ticket.title}
          </h4>
          <TypePill type={ticket.type} />
          <StatusPill status={ticket.status} />
        </div>

        <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-[var(--text-muted)]">
          {ticket.summary}
        </p>

        <div className="mt-2 flex items-center gap-3 text-[10.5px] text-[var(--text-dim)]">
          <span className="flex items-center gap-1">
            <MessageSquare size={10.5} />
            {ticket.messages.length} {ticket.messages.length === 1 ? "msg" : "msgs"}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={10.5} />
            {ageDisplay}
          </span>
          {ticket.stalled && (
            <span className="flex items-center gap-1 text-[var(--risk-high)]">
              <AlertTriangle size={10.5} />
              stalled
            </span>
          )}
          <span className="ml-auto">
            updated {formatRelativeTime(ticket.updatedAt)}
          </span>
        </div>
      </div>

      <ChevronRight
        size={14}
        className="mt-1 shrink-0 text-[var(--text-dim)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text-muted)]"
      />
    </Link>
  );
}
