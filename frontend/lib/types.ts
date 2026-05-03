export type RiskLevel = "low" | "medium" | "high";
export type RiskTrend = "up" | "down" | "flat";
export type TicketStatus =
  | "needs_reply"
  | "active"
  | "waiting_customer"
  | "resolved";
export type Severity = "low" | "medium" | "high";
export type PlanTier = "starter" | "growth" | "enterprise";

export type Author = {
  name: string;
  handle: string;
  isInternal: boolean;
};

export type Message = {
  id: string;
  ticketId: string;
  customerId: string;
  author: Author;
  text: string;
  channel: string;
  ts: string; // ISO
};

export type Ticket = {
  id: string;
  customerId: string;
  title: string;
  summary: string;
  status: TicketStatus;
  severity: Severity;
  ageHours: number;
  stalled: boolean;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  nextStep: string;
};

export type Customer = {
  id: string;
  name: string;
  domain: string;
  plan: PlanTier;
  csm: string;
  risk: RiskLevel;
  riskScore: number; // 0-100
  riskExplanation: string;
  trend: RiskTrend;
  recentSignal: string;
  nextAction: string;
  lastActivityAt: string;
  joinedAt: string;
  // Derived in UI from tickets[], but cached here for perf in dummy mode
  ticketCounts: Record<TicketStatus, number>;
};
