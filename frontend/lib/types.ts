export type RiskLevel = "low" | "medium" | "high";
export type TicketStatus =
  | "needs_reply"
  | "active"
  | "waiting_customer"
  | "resolved";
export type Severity = "low" | "medium" | "high";
export type PlanTier = "starter" | "growth" | "enterprise";
export type TicketType = "bug" | "feature_request" | "question";

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

export type TicketFeatures = {
  messages: number; // 0-3 (deterministic — bucketed message count)
  people: number; // 0-3 (deterministic — bucketed distinct senders)
  urgency: number; // 0-3 (LLM)
  consequence: number; // 0-3 (LLM)
  sentiment: number; // 0-3 (LLM)
  severityScore: number; // 0-15 (sum)
  severityLabel: Severity;
};

export type Ticket = {
  id: string;
  customerId: string;
  title: string;
  summary: string;
  type: TicketType;
  status: TicketStatus;
  severity: Severity;
  ageHours: number;
  stalled: boolean;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  nextStep: string;
  features: TicketFeatures | null;
};

export type Customer = {
  id: string;
  name: string;
  domain: string;
  plan: PlanTier;
  risk: RiskLevel;
  lastActivityAt: string;
  ticketCounts: Record<TicketStatus, number>;
};
