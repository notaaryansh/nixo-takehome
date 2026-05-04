import type { Severity } from "@/lib/types";

const styles: Record<Severity, { fg: string; bg: string; dot: string; label: string }> = {
  high: {
    fg: "text-[var(--severity-high)]",
    bg: "bg-[var(--severity-high-bg)]",
    dot: "bg-[var(--severity-high)]",
    label: "High",
  },
  medium: {
    fg: "text-[var(--severity-medium)]",
    bg: "bg-[var(--severity-medium-bg)]",
    dot: "bg-[var(--severity-medium)]",
    label: "Medium",
  },
  low: {
    fg: "text-[var(--severity-low)]",
    bg: "bg-[var(--severity-low-bg)]",
    dot: "bg-[var(--severity-low)]",
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
