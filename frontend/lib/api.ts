import type {
  Customer,
  Message as UIMessage,
  Ticket,
  TicketStatus,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const NOT_IMPLEMENTED = "backend not implemented yet";

// ---------- backend types (mirror app/models.py) ----------

export type BackendRole = "client" | "engineer";
export type BackendEventType = "bug" | "feature_request" | "question";
export type BackendEventStatus =
  | "needs_reply"
  | "active"
  | "waiting_on_customer"
  | "resolved";

export type BackendMessage = {
  id: string;
  sender: string;
  role: BackendRole;
  content: string;
  channel: string;
  timestamp: string;
};

export type BackendSeverityLabel = "low" | "medium" | "high";

export type BackendTicketFeatures = {
  messages: number; // 0-3, deterministic
  people: number; // 0-3, deterministic
  urgency: number; // 0-3, LLM
  consequence: number; // 0-3, LLM
  sentiment: number; // 0-3, LLM
  severity_score: number; // 0-15, sum
  severity_label: BackendSeverityLabel;
};

export type BackendEvent = {
  id: string;
  heading: string;
  summary: string;
  type: BackendEventType;
  message_ids: string[];
  sender: string;
  channel: string;
  timestamp: string;
  status: BackendEventStatus | null;
  next_step: string | null;
  features: BackendTicketFeatures | null;
};

export type BackendRiskLevel = "low" | "medium" | "high";

export type BackendCustomerRisk = {
  channel: string;
  risk_level: BackendRiskLevel;
};

// ---------- fetch helpers ----------

const fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`${path} → ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
};

export const apiHealth = () => fetchJson<{ status: string }>("/health");

export const apiGetChannels = () => fetchJson<string[]>("/channels");

export const apiGetMessages = (channel?: string) =>
  fetchJson<BackendMessage[]>(
    `/messages${channel ? `?channel=${encodeURIComponent(channel)}` : ""}`,
  );

export const apiGetEvents = (channel?: string) =>
  fetchJson<BackendEvent[]>(
    `/events${channel ? `?channel=${encodeURIComponent(channel)}` : ""}`,
  );

export const apiRunPipeline = () =>
  fetchJson<{ events: BackendEvent[]; risks: BackendCustomerRisk[] }>(
    "/pipeline/run",
    { method: "POST" },
  );

export const apiGetRisks = () =>
  fetchJson<BackendCustomerRisk[]>("/risks");

export const apiGetCustomerRisk = (channel: string) =>
  fetchJson<BackendCustomerRisk>(
    `/customers/${encodeURIComponent(channel)}/risk`,
  );

// ---------- adapters: backend → UI types ----------

const statusMap: Record<BackendEventStatus, TicketStatus> = {
  needs_reply: "needs_reply",
  active: "active",
  waiting_on_customer: "waiting_customer",
  resolved: "resolved",
};

export const adaptStatus = (
  s: BackendEventStatus | null,
): TicketStatus => (s ? statusMap[s] : "needs_reply");

export const adaptMessage = (
  m: BackendMessage,
  ticketId: string,
): UIMessage => ({
  id: m.id,
  ticketId,
  customerId: m.channel,
  author: {
    name: m.sender,
    handle: m.sender.toLowerCase(),
    isInternal: m.role === "engineer",
  },
  text: m.content,
  channel: `#${m.channel}`,
  ts: m.timestamp,
});

export const adaptEventToTicket = (
  e: BackendEvent,
  allMessages: BackendMessage[],
  nowMs: number,
): Ticket => {
  const messages = allMessages
    .filter((m) => e.message_ids.includes(m.id))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((m) => adaptMessage(m, e.id));

  const ageMs = nowMs - new Date(e.timestamp).getTime();
  const ageHours = Math.max(0, Math.floor(ageMs / 3_600_000));

  const lastTs = messages[messages.length - 1]?.ts ?? e.timestamp;

  const f = e.features;
  return {
    id: e.id,
    customerId: e.channel,
    title: e.heading,
    summary: e.summary,
    status: adaptStatus(e.status),
    severity: f?.severity_label ?? "medium",
    ageHours,
    stalled: false,
    createdAt: e.timestamp,
    updatedAt: lastTs,
    messages,
    nextStep: e.next_step ?? NOT_IMPLEMENTED,
    features: f
      ? {
          messages: f.messages,
          people: f.people,
          urgency: f.urgency,
          consequence: f.consequence,
          sentiment: f.sentiment,
          severityScore: f.severity_score,
          severityLabel: f.severity_label,
        }
      : null,
  };
};

export const channelDisplayName = (channel: string) =>
  channel
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");

export type CustomerWithTickets = {
  customer: Customer;
  tickets: Ticket[];
  messages: UIMessage[];
};

export type ChannelSummary = {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  lastTs: string;
  preview: string;
};

export const buildChannelSummaries = (
  channels: string[],
  messages: BackendMessage[],
): ChannelSummary[] =>
  channels
    .map((channel) => {
      const channelMessages = messages
        .filter((m) => m.channel === channel)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      const last = channelMessages[0];
      return {
        id: channel,
        name: channel,
        customerId: channel,
        customerName: channelDisplayName(channel),
        lastTs: last?.timestamp ?? "",
        preview: last?.content ?? "",
      };
    })
    .sort((a, b) => b.lastTs.localeCompare(a.lastTs));

export const buildCustomers = (
  channels: string[],
  events: BackendEvent[],
  messages: BackendMessage[],
  nowMs: number,
  risks: BackendCustomerRisk[] = [],
): CustomerWithTickets[] => {
  const riskByChannel = new Map(risks.map((r) => [r.channel, r]));

  return channels.map((channel) => {
    const channelEvents = events.filter((e) => e.channel === channel);
    const channelMessages = messages.filter((m) => m.channel === channel);
    const risk = riskByChannel.get(channel);

    const tickets = channelEvents.map((e) =>
      adaptEventToTicket(e, messages, nowMs),
    );

    const ticketCounts = {
      needs_reply: 0,
      active: 0,
      waiting_customer: 0,
      resolved: 0,
    } as Record<TicketStatus, number>;
    tickets.forEach((t) => {
      ticketCounts[t.status] += 1;
    });

    const lastActivityAt =
      channelMessages
        .map((m) => m.timestamp)
        .sort()
        .at(-1) ?? new Date(nowMs).toISOString();

    const customer: Customer = {
      id: channel,
      name: channelDisplayName(channel),
      domain: `${channel}.com`,
      plan: "starter",
      risk: risk ? risk.risk_level : "medium",
      lastActivityAt,
      ticketCounts,
    };

    return {
      customer,
      tickets,
      messages: channelMessages.map((m) => {
        const owningEvent = channelEvents.find((e) =>
          e.message_ids.includes(m.id),
        );
        return adaptMessage(m, owningEvent?.id ?? "");
      }),
    };
  });
};
