import { CustomerList } from "@/components/customer-list";
import { PipelineGate } from "@/components/pipeline-gate";
import { PollRefresh } from "@/components/poll-refresh";
import {
  apiGetChannels,
  apiGetEvents,
  apiGetMessages,
  apiGetRisks,
  buildCustomers,
} from "@/lib/api";
import { riskRank } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const nowMs = Date.now();
  let error: string | null = null;
  let channels: string[] = [];
  let events: Awaited<ReturnType<typeof apiGetEvents>> = [];
  let messages: Awaited<ReturnType<typeof apiGetMessages>> = [];
  let risks: Awaited<ReturnType<typeof apiGetRisks>> = [];

  try {
    [channels, events, messages, risks] = await Promise.all([
      apiGetChannels(),
      apiGetEvents(),
      apiGetMessages(),
      apiGetRisks(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const customerData = buildCustomers(channels, events, messages, nowMs, risks);
  const customers = customerData
    .map((c) => c.customer)
    .sort((a, b) => {
      if (riskRank[a.risk] !== riskRank[b.risk])
        return riskRank[a.risk] - riskRank[b.risk];
      return a.name.localeCompare(b.name);
    });

  const hour = new Date().getHours();
  const partOfDay =
    hour < 5
      ? "evening"
      : hour < 12
        ? "morning"
        : hour < 18
          ? "afternoon"
          : "evening";
  const greeting = `Good ${partOfDay}, Priya`;

  const totals = customers.reduce(
    (acc, c) => ({
      needs_reply: acc.needs_reply + c.ticketCounts.needs_reply,
      active: acc.active + c.ticketCounts.active,
      waiting_customer: acc.waiting_customer + c.ticketCounts.waiting_customer,
      resolved: acc.resolved + c.ticketCounts.resolved,
    }),
    { needs_reply: 0, active: 0, waiting_customer: 0, resolved: 0 },
  );
  const openCount = totals.needs_reply + totals.active + totals.waiting_customer;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <PollRefresh intervalMs={5000} />
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
        <div>
          <h1 className="text-[15px] font-semibold text-[var(--text)]">
            {greeting}
          </h1>
          {customers.length > 0 && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-[var(--text-muted)]">
              <span>
                {customers.length} customer{customers.length === 1 ? "" : "s"}
              </span>
              {openCount > 0 || totals.resolved > 0 ? (
                <>
                  <span className="text-[var(--text-dim)]">·</span>
                  {totals.needs_reply > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-[var(--risk-high)]">●</span>
                      {totals.needs_reply} needs reply
                    </span>
                  )}
                  {totals.active > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-[#3B82F6]">●</span>
                      {totals.active} active
                    </span>
                  )}
                  {totals.waiting_customer > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-[var(--risk-med)]">●</span>
                      {totals.waiting_customer} waiting
                    </span>
                  )}
                  {totals.resolved > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-[var(--risk-low)]">●</span>
                      {totals.resolved} resolved
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-[var(--text-dim)]">·</span>
                  <span>No open tickets</span>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-md border border-[var(--risk-high)]/40 bg-[var(--risk-high-bg)] px-3 py-2 text-[11.5px] text-[var(--risk-high)]">
          Backend unreachable: {error}
        </div>
      )}

      <div className="px-6 py-6">
        <PipelineGate shouldRun={events.length === 0 && !error}>
          {customers.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-[var(--border)] text-[12px] text-[var(--text-dim)]">
              {error
                ? "Couldn’t load data from backend."
                : "No customers yet."}
            </div>
          ) : (
            <CustomerList customers={customers} />
          )}
        </PipelineGate>
      </div>
    </div>
  );
}

