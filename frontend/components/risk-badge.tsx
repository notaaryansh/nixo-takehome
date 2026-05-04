import type { RiskLevel } from "@/lib/types";

const styles: Record<RiskLevel, { bg: string; fg: string; dot: string; label: string }> = {
  high: {
    bg: "bg-[var(--severity-high-bg)]",
    fg: "text-[var(--severity-high)]",
    dot: "bg-[var(--severity-high)]",
    label: "High",
  },
  medium: {
    bg: "bg-[var(--severity-medium-bg)]",
    fg: "text-[var(--severity-medium)]",
    dot: "bg-[var(--severity-medium)]",
    label: "Medium",
  },
  low: {
    bg: "bg-[var(--severity-low-bg)]",
    fg: "text-[var(--severity-low)]",
    dot: "bg-[var(--severity-low)]",
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
