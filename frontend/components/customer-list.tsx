import Link from "next/link";
import { ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Customer } from "@/lib/types";
import { RiskBadge } from "./risk-badge";
import { CustomerAvatar } from "./customer-avatar";
import { formatRelativeTime } from "@/lib/format";

const TrendIcon = ({ trend }: { trend: Customer["trend"] }) => {
  if (trend === "up")
    return <TrendingUp size={12} className="text-[var(--risk-high)]" />;
  if (trend === "down")
    return <TrendingDown size={12} className="text-[var(--risk-low)]" />;
  return <Minus size={12} className="text-[var(--text-dim)]" />;
};

export function CustomerList({ customers }: { customers: Customer[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]">
      <div className="grid grid-cols-[1fr_120px_220px_140px_28px] items-center gap-4 border-b border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
        <span>Customer</span>
        <span>Risk</span>
        <span>Open tickets</span>
        <span>Last signal</span>
        <span />
      </div>

      {customers.map((c) => (
        <Link
          key={c.id}
          href={`/customers/${c.id}`}
          className="group grid grid-cols-[1fr_120px_220px_140px_28px] items-center gap-4 border-b border-[var(--border)] px-4 py-3 transition-colors last:border-b-0 hover:bg-[var(--surface-hover)]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <CustomerAvatar id={c.id} name={c.name} size={28} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[13px] font-medium text-[var(--text)]">
                  {c.name}
                </span>
                <span className="rounded border border-[var(--border)] px-1 py-0 text-[9.5px] uppercase tracking-wider text-[var(--text-dim)]">
                  {c.plan}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11.5px] text-[var(--text-muted)]">
                {c.riskExplanation}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <RiskBadge level={c.risk} />
            <TrendIcon trend={c.trend} />
          </div>

          <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
            {c.ticketCounts.needs_reply > 0 && (
              <span className="rounded bg-[var(--surface)] px-1.5 py-0.5">
                <span className="text-[var(--risk-high)]">●</span>{" "}
                {c.ticketCounts.needs_reply} needs reply
              </span>
            )}
            {c.ticketCounts.active > 0 && (
              <span className="rounded bg-[var(--surface)] px-1.5 py-0.5">
                <span className="text-[#3B82F6]">●</span>{" "}
                {c.ticketCounts.active} active
              </span>
            )}
            {c.ticketCounts.waiting_customer > 0 && (
              <span className="rounded bg-[var(--surface)] px-1.5 py-0.5">
                <span className="text-[var(--risk-med)]">●</span>{" "}
                {c.ticketCounts.waiting_customer} waiting
              </span>
            )}
            {c.ticketCounts.resolved > 0 && (
              <span className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[var(--text-dim)]">
                {c.ticketCounts.resolved} done
              </span>
            )}
          </div>

          <div className="text-[11.5px] text-[var(--text-muted)]">
            {formatRelativeTime(c.lastActivityAt)}
          </div>

          <ChevronRight
            size={14}
            className="text-[var(--text-dim)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text-muted)]"
          />
        </Link>
      ))}
    </div>
  );
}
