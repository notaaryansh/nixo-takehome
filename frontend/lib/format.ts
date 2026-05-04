import type { RiskLevel, Severity, TicketStatus } from "./types";

export const formatRelativeTime = (iso: string, nowMs?: number) => {
  const now = nowMs ?? Date.now();
  const ms = now - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

export const statusLabel: Record<TicketStatus, string> = {
  needs_reply: "Needs reply",
  active: "Active",
  waiting_customer: "Waiting on customer",
  resolved: "Resolved",
};

export const statusOrder: TicketStatus[] = [
  "needs_reply",
  "active",
  "waiting_customer",
  "resolved",
];

export const statusRank: Record<TicketStatus, number> = {
  needs_reply: 0,
  active: 1,
  waiting_customer: 2,
  resolved: 3,
};

export const riskRank: Record<RiskLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const severityRank: Record<Severity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};
