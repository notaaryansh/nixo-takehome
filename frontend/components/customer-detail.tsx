import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Customer, Ticket } from "@/lib/types";
import { RiskBadge } from "./risk-badge";
import { CustomerAvatar } from "./customer-avatar";
import { TicketRow } from "./ticket-row";
import { formatRelativeTime, severityRank, statusRank } from "@/lib/format";

export function CustomerDetail({
  customer,
  tickets,
}: {
  customer: Customer;
  tickets: Ticket[];
}) {
  const sortedTickets = [...tickets].sort((a, b) => {
    if (severityRank[a.severity] !== severityRank[b.severity])
      return severityRank[a.severity] - severityRank[b.severity];
    if (statusRank[a.status] !== statusRank[b.status])
      return statusRank[a.status] - statusRank[b.status];
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const stalledCount = tickets.filter((t) => t.stalled).length;

  return (
    <div className="flex h-full flex-col">
      {/* breadcrumb */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-6 py-2 text-[11.5px] text-[var(--text-muted)]">
        <Link
          href="/"
          className="rounded px-1.5 py-0.5 hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
        >
          All customers
        </Link>
        <span className="text-[var(--text-dim)]">/</span>
        <span className="text-[var(--text)]">{customer.name}</span>
      </div>

      {/* header */}
      <div className="border-b border-[var(--border)] px-6 py-4">
        <div className="flex items-start gap-3">
          <Link
            href="/"
            className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            aria-label="Back to all customers"
          >
            <ArrowLeft size={14} />
          </Link>
          <CustomerAvatar id={customer.id} name={customer.name} size={36} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-semibold text-[var(--text)]">
                {customer.name}
              </h1>
              <span className="text-[11.5px] text-[var(--text-dim)]">
                {customer.domain}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-[11.5px] text-[var(--text-muted)]">
              <RiskBadge level={customer.risk} />
              <span className="text-[var(--text-dim)]">·</span>
              <span>Last activity {formatRelativeTime(customer.lastActivityAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[11.5px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]">
              Open in Slack
            </button>
            <button className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-[11.5px] font-medium text-white hover:bg-[var(--accent-soft)]">
              Take action
            </button>
          </div>
        </div>
      </div>

      {/* tickets — full width */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between border-b border-[var(--border)] px-6 py-3">
          <h2 className="text-[12.5px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Tickets
          </h2>
          <span className="text-[11px] text-[var(--text-dim)]">
            {tickets.length} total
            {stalledCount > 0 && (
              <span className="ml-2 text-[var(--risk-high)]">
                · {stalledCount} stalled
              </span>
            )}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-6 py-4">
          {sortedTickets.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-[var(--border)] text-[11px] text-[var(--text-dim)]">
              No tickets for this customer.
            </div>
          ) : (
            sortedTickets.map((t) => <TicketRow key={t.id} ticket={t} />)
          )}
        </div>
      </div>
    </div>
  );
}
