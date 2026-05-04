import type { Severity } from "@/lib/types";

const styles: Record<Severity, { fg: string; bg: string; dot: string; label: string }> = {
  high: {
    fg: "text-[var(--risk-high)]",
    bg: "bg-[var(--risk-high-bg)]",
    dot: "bg-[var(--risk-high)]",
    label: "High",
  },
  medium: {
    fg: "text-[var(--risk-med)]",
    bg: "bg-[var(--risk-med-bg)]",
    dot: "bg-[var(--risk-med)]",
    label: "Medium",
  },
  low: {
    fg: "text-[var(--risk-low)]",
    bg: "bg-[var(--risk-low-bg)]",
    dot: "bg-[var(--risk-low)]",
    label: "Low",
  },
};

export function SeverityPill({ severity }: { severity: Severity }) {
  const s = styles[severity];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-medium ${s.bg} ${s.fg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
