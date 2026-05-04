import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Clock,
  MessageSquare,
} from "lucide-react";
import type { Customer, Ticket, TicketFeatures } from "@/lib/types";
import { NOT_IMPLEMENTED } from "@/lib/api";
import { StatusPill } from "./status-pill";
import { SeverityPill } from "./severity-pill";
import { TypePill } from "./type-pill";
import { MessageSnapshot } from "./message-snapshot";
import { NotImplemented } from "./not-implemented";
import { formatRelativeTime } from "@/lib/format";

const severityDot: Record<Ticket["severity"], { dot: string; label: string }> = {
  high: { dot: "bg-[var(--risk-high)]", label: "High severity" },
  medium: { dot: "bg-[var(--risk-med)]", label: "Medium severity" },
  low: { dot: "bg-[var(--risk-low)]", label: "Low severity" },
};

export function TicketDetail({
  customer,
  ticket,
}: {
  customer: Customer;
  ticket: Ticket;
}) {
  const sev = severityDot[ticket.severity];
  const ageDisplay =
    ticket.ageHours >= 24
      ? `${Math.floor(ticket.ageHours / 24)}d`
      : `${ticket.ageHours}h`;
  const sortedMessages = [...ticket.messages].sort(
    (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime(),
  );
  const nextStepNotImpl = ticket.nextStep === NOT_IMPLEMENTED;
  const severityNotImpl = ticket.features === null;

  return (
    <div className="flex h-full flex-col">
      {/* breadcrumb */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-6 py-2 text-[11.5px] text-[var(--text-muted)]">
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
        >
          All customers
        </Link>
        <span className="text-[var(--text-dim)]">/</span>
        <Link
          href={`/customers/${customer.id}`}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
        >
          {customer.name}
        </Link>
        <span className="text-[var(--text-dim)]">/</span>
        <span className="truncate text-[var(--text)]">{ticket.title}</span>
      </div>

      {/* header */}
      <div className="border-b border-[var(--border)] px-6 py-4">
        <div className="flex items-start gap-3">
          <Link
            href={`/customers/${customer.id}`}
            className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            aria-label="Back to customer"
          >
            <ArrowLeft size={14} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[15px] font-semibold text-[var(--text)]">
                {ticket.title}
              </h1>
              <TypePill type={ticket.type} />
              <StatusPill status={ticket.status} />
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-[11.5px] text-[var(--text-muted)]">
              {severityNotImpl ? (
                <NotImplemented label="severity" />
              ) : (
                <span
                  className="inline-flex items-center gap-1.5"
                  title={sev.label}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
                  {sev.label}
                </span>
              )}
              <span className="text-[var(--text-dim)]">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock size={11} /> {ageDisplay} old
              </span>
              <span className="text-[var(--text-dim)]">·</span>
              <span className="inline-flex items-center gap-1">
                <MessageSquare size={11} /> {ticket.messages.length} messages
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 30/70 split */}
      <div className="grid min-h-0 flex-1 grid-cols-[30%_70%]">
        {/* left: ticket-level insights */}
        <div className="flex flex-col gap-3 overflow-y-auto border-r border-[var(--border)] px-5 py-5">
          <InsightCard
            icon={<ClipboardList size={13} />}
            label="Summary"
            body={ticket.summary}
          />
          <InsightCard
            icon={<ArrowRight size={13} />}
            label="Suggested next step"
            body={ticket.nextStep}
            accent={!nextStepNotImpl}
          />
          <div className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
              Metadata
            </div>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[11.5px]">
              <dt className="text-[var(--text-dim)]">Customer</dt>
              <dd className="text-[var(--text)]">
                <Link
                  className="hover:text-[var(--accent-soft)]"
                  href={`/customers/${customer.id}`}
                >
                  {customer.name}
                </Link>
              </dd>
              <dt className="text-[var(--text-dim)]">Type</dt>
              <dd>
                <TypePill type={ticket.type} />
              </dd>
              <dt className="text-[var(--text-dim)]">Status</dt>
              <dd>
                <StatusPill status={ticket.status} />
              </dd>
              <dt className="text-[var(--text-dim)]">Severity</dt>
              <dd>
                {severityNotImpl ? (
                  <NotImplemented label="severity" />
                ) : (
                  <SeverityPill severity={ticket.severity} />
                )}
              </dd>
              <dt className="text-[var(--text-dim)]">Created</dt>
              <dd className="text-[var(--text)]">
                {formatRelativeTime(ticket.createdAt)}
              </dd>
              <dt className="text-[var(--text-dim)]">Updated</dt>
              <dd className="text-[var(--text)]">
                {formatRelativeTime(ticket.updatedAt)}
              </dd>
            </dl>
          </div>

          {ticket.features && (
            <SeverityBreakdown features={ticket.features} />
          )}
        </div>

        {/* right: source of truth */}
        <div className="flex min-h-0 flex-col">
          <div className="flex items-baseline justify-between border-b border-[var(--border)] px-5 py-3">
            <div>
              <h2 className="text-[12.5px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Source of truth
              </h2>
              <p className="mt-0.5 text-[10.5px] text-[var(--text-dim)]">
                Messages this ticket was inferred from. Click <span className="text-[var(--text-muted)]">View in Slack</span> to jump to the original.
              </p>
            </div>
            <span className="text-[11px] text-[var(--text-dim)]">
              {ticket.messages.length} messages
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-4">
            {sortedMessages.map((m) => (
              <MessageSnapshot
                key={m.id}
                message={m}
                customerId={customer.id}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturePills({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  return (
    <div>
      <div className="text-[10.5px] text-[var(--text-muted)]">{label}</div>
      <div className="mt-1.5 flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < value ? "bg-[var(--accent)]" : "bg-[var(--surface)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function SeverityBreakdown({ features }: { features: TicketFeatures }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
        Severity breakdown
      </div>
      <div className="mt-3 flex flex-col gap-2.5">
        <FeaturePills label="Urgency" value={features.urgency} max={3} />
        <FeaturePills label="Impact" value={features.consequence} max={3} />
        <FeaturePills label="Sentiment" value={features.sentiment} max={3} />
        <FeaturePills label="Frequency" value={features.messages} max={3} />
        <FeaturePills label="Escalation" value={features.people} max={3} />
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
  const notImpl = body === NOT_IMPLEMENTED;
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
      <div className="mt-1.5">
        {notImpl ? (
          <NotImplemented />
        ) : (
          <p className="text-[12px] leading-relaxed text-[var(--text)]">{body}</p>
        )}
      </div>
    </div>
  );
}
