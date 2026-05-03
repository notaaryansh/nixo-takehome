import type { RiskLevel } from "@/lib/types";

const styles: Record<RiskLevel, { bg: string; fg: string; dot: string; label: string }> = {
  high: {
    bg: "bg-[var(--risk-high-bg)]",
    fg: "text-[var(--risk-high)]",
    dot: "bg-[var(--risk-high)]",
    label: "High risk",
  },
  medium: {
    bg: "bg-[var(--risk-med-bg)]",
    fg: "text-[var(--risk-med)]",
    dot: "bg-[var(--risk-med)]",
    label: "Medium",
  },
  low: {
    bg: "bg-[var(--risk-low-bg)]",
    fg: "text-[var(--risk-low)]",
    dot: "bg-[var(--risk-low)]",
    label: "Low",
  },
};

export function RiskBadge({ level, size = "sm" }: { level: RiskLevel; size?: "sm" | "xs" }) {
  const s = styles[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium ${s.bg} ${s.fg} ${
        size === "xs" ? "px-1.5 py-0.5 text-[10.5px]" : "px-2 py-0.5 text-[11px]"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function RiskDot({ level }: { level: RiskLevel }) {
  return <span className={`h-2 w-2 rounded-full ${styles[level].dot}`} />;
}
