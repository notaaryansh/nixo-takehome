import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  MessageSquareWarning,
} from "lucide-react";
import type { Customer, Ticket } from "@/lib/types";
import { RiskBadge } from "./risk-badge";
import { CustomerAvatar } from "./customer-avatar";
import { TicketRow } from "./ticket-row";
import { formatRelativeTime, statusRank } from "@/lib/format";

const TrendIcon = ({ trend }: { trend: Customer["trend"] }) => {
  if (trend === "up")
    return (
      <span className="inline-flex items-center gap-1 text-[var(--risk-high)]">
        <TrendingUp size={12} /> trending up
      </span>
    );
  if (trend === "down")
    return (
      <span className="inline-flex items-center gap-1 text-[var(--risk-low)]">
        <TrendingDown size={12} /> trending down
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[var(--text-dim)]">
      <Minus size={12} /> stable
    </span>
  );
};

export function CustomerDetail({
  customer,
  tickets,
}: {
  customer: Customer;
  tickets: Ticket[];
}) {
  const sortedTickets = [...tickets].sort((a, b) => {
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
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
        >
          <ArrowLeft size={12} />
          All customers
        </Link>
        <span className="text-[var(--text-dim)]">/</span>
        <span className="text-[var(--text)]">{customer.name}</span>
      </div>

      {/* header */}
      <div className="border-b border-[var(--border)] px-6 py-4">
        <div className="flex items-start gap-4">
          <CustomerAvatar id={customer.id} name={customer.name} size={36} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-semibold text-[var(--text)]">
                {customer.name}
              </h1>
              <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
                {customer.plan}
              </span>
              <span className="text-[11.5px] text-[var(--text-dim)]">
                {customer.domain}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-[11.5px] text-[var(--text-muted)]">
              <RiskBadge level={customer.risk} />
              <span className="text-[var(--text-dim)]">·</span>
              <TrendIcon trend={customer.trend} />
              <span className="text-[var(--text-dim)]">·</span>
              <span>Last activity {formatRelativeTime(customer.lastActivityAt)}</span>
              <span className="text-[var(--text-dim)]">·</span>
              <span>CSM {customer.csm}</span>
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

      {/* 30/70 split */}
      <div className="grid min-h-0 flex-1 grid-cols-[30%_70%]">
        {/* left: stacked insights */}
        <div className="flex flex-col gap-3 overflow-y-auto border-r border-[var(--border)] px-5 py-5">
          <InsightCard
            icon={<MessageSquareWarning size={13} />}
            label="Why flagged"
            body={customer.riskExplanation}
          />
          <InsightCard
            icon={<Sparkles size={13} />}
            label="Most relevant signal"
            body={customer.recentSignal}
          />
          <InsightCard
            icon={<ArrowRight size={13} />}
            label="Suggested next step"
            body={customer.nextAction}
            accent
          />
        </div>

        {/* right: scrollable ticket list */}
        <div className="flex min-h-0 flex-col">
          <div className="flex items-baseline justify-between border-b border-[var(--border)] px-5 py-3">
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
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-4">
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
    </div>
  );
}

function InsightCard({
  icon,
  label,
  body,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  body: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-3 ${
        accent
          ? "border-[var(--accent)]/30 bg-[var(--accent-bg)]"
          : "border-[var(--border)] bg-[var(--bg-elevated)]"
      }`}
    >
      <div
        className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${
          accent ? "text-[var(--accent-soft)]" : "text-[var(--text-dim)]"
        }`}
      >
        {icon}
        {label}
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--text)]">{body}</p>
    </div>
  );
}
