import { CircleDashed } from "lucide-react";

export function NotImplemented({
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--text-dim)] ${className}`}
      title="backend not implemented yet"
    >
      <CircleDashed size={10} />
      {label ?? "backend not implemented yet"}
    </span>
  );
}
