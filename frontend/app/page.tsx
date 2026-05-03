import { CustomerList } from "@/components/customer-list";
import { getCustomers } from "@/lib/fixtures";
import { AlertTriangle, Activity, CheckCircle2 } from "lucide-react";

export default function Home() {
  const customers = getCustomers();
  const high = customers.filter((c) => c.risk === "high").length;
  const medium = customers.filter((c) => c.risk === "medium").length;
  const low = customers.filter((c) => c.risk === "low").length;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
        <div>
          <h1 className="text-[15px] font-semibold text-[var(--text)]">All customers</h1>
          <p className="mt-0.5 text-[11.5px] text-[var(--text-muted)]">
            Sorted by risk score · {customers.length} accounts
          </p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[11.5px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]">
            Filter
          </button>
          <button className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-[11.5px] font-medium text-white hover:bg-[var(--accent-soft)]">
            New simulation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 px-6 py-4">
        <MetricCard
          icon={<AlertTriangle size={13} className="text-[var(--risk-high)]" />}
          label="High risk"
          value={high}
          accent="high"
        />
        <MetricCard
          icon={<Activity size={13} className="text-[var(--risk-med)]" />}
          label="Medium risk"
          value={medium}
        />
        <MetricCard
          icon={<CheckCircle2 size={13} className="text-[var(--risk-low)]" />}
          label="Healthy"
          value={low}
        />
      </div>

      <div className="px-6 pb-6">
        <CustomerList customers={customers} />
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: "high";
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        accent === "high"
          ? "border-[var(--risk-high)]/30 bg-[var(--risk-high-bg)]"
          : "border-[var(--border)] bg-[var(--bg-elevated)]"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-[24px] font-semibold leading-none text-[var(--text)]">
        {value}
      </div>
    </div>
  );
}
