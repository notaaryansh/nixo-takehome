import type { Customer, Ticket, Message } from "./types";

const now = Date.UTC(2026, 4, 3, 14, 0, 0); // 2026-05-03T14:00:00Z, deterministic
const hoursAgo = (h: number) => new Date(now - h * 3600 * 1000).toISOString();

const fde = { name: "Priya Shah", handle: "priya", isInternal: true };

// ---------- ACME ---------- (high risk, dedup demo)
const acmeMessages: Message[] = [
  {
    id: "m-acme-1",
    ticketId: "t-acme-login",
    customerId: "acme",
    author: { name: "Alice Chen", handle: "alice", isInternal: false },
    text: "hey our login is completely broken, getting 500s on every attempt",
    channel: "#acme-support",
    ts: hoursAgo(72),
  },
  {
    id: "m-acme-2",
    ticketId: "t-acme-login",
    customerId: "acme",
    author: { name: "Alice Chen", handle: "alice", isInternal: false },
    text: "still can't get in, this is blocking our whole team",
    channel: "#acme-support",
    ts: hoursAgo(70),
  },
  {
    id: "m-acme-3",
    ticketId: "t-acme-login",
    customerId: "acme",
    author: { name: "Bob Patel", handle: "bobp", isInternal: false },
    text: "any update on the login thing? we're dead in the water here",
    channel: "#acme-support",
    ts: hoursAgo(40),
  },
  {
    id: "m-acme-4",
    ticketId: "t-acme-login",
    customerId: "acme",
    author: { name: "Alice Chen", handle: "alice", isInternal: false },
    text: "ping — login is still throwing 500s",
    channel: "#acme-support",
    ts: hoursAgo(8),
  },
  {
    id: "m-acme-sso-1",
    ticketId: "t-acme-sso",
    customerId: "acme",
    author: { name: "Carla Reyes", handle: "carla", isInternal: false },
    text: "SAML config keeps reverting after we save it",
    channel: "#acme-support",
    ts: hoursAgo(28),
  },
  {
    id: "m-acme-sso-2",
    ticketId: "t-acme-sso",
    customerId: "acme",
    author: { ...fde },
    text: "Looking into the SAML revert — can you share the IdP metadata XML?",
    channel: "#acme-support",
    ts: hoursAgo(26),
  },
];

// ---------- GLOBEX ---------- (high risk, billing escalation)
const globexMessages: Message[] = [
  {
    id: "m-glob-1",
    ticketId: "t-glob-payment",
    customerId: "globex",
    author: { name: "Derek Owens", handle: "derek", isInternal: false },
    text: "got a payment_failed email this morning, but the card on file is fine",
    channel: "#globex-success",
    ts: hoursAgo(36),
  },
  {
    id: "m-glob-2",
    ticketId: "t-glob-payment",
    customerId: "globex",
    author: { name: "Derek Owens", handle: "derek", isInternal: false },
    text: "now our integrations are paused. this is a production issue.",
    channel: "#globex-success",
    ts: hoursAgo(20),
  },
  {
    id: "m-glob-3",
    ticketId: "t-glob-payment",
    customerId: "globex",
    author: { name: "Eva Lin (VP Eng)", handle: "evalin", isInternal: false },
    text: "Looping in. We need this resolved today or we're escalating internally.",
    channel: "#globex-success",
    ts: hoursAgo(6),
  },
  {
    id: "m-glob-export-1",
    ticketId: "t-glob-export",
    customerId: "globex",
    author: { name: "Derek Owens", handle: "derek", isInternal: false },
    text: "CSV export endpoint times out for accounts >10k rows",
    channel: "#globex-success",
    ts: hoursAgo(96),
  },
  {
    id: "m-glob-export-2",
    ticketId: "t-glob-export",
    customerId: "globex",
    author: { ...fde },
    text: "Pushed a streaming fix — can you retest on staging?",
    channel: "#globex-success",
    ts: hoursAgo(48),
  },
];

// ---------- INITECH ---------- (medium risk, going quiet)
const initechMessages: Message[] = [
  {
    id: "m-init-1",
    ticketId: "t-init-quiet",
    customerId: "initech",
    author: { name: "Michael Bolton", handle: "mbolton", isInternal: false },
    text: "thanks, that worked",
    channel: "#initech",
    ts: hoursAgo(14 * 24),
  },
  {
    id: "m-init-2",
    ticketId: "t-init-webhook",
    customerId: "initech",
    author: { name: "Samir Nagheenanajar", handle: "samir", isInternal: false },
    text: "we'd like to retry failed webhooks automatically — is that on the roadmap?",
    channel: "#initech",
    ts: hoursAgo(21 * 24),
  },
  {
    id: "m-init-3",
    ticketId: "t-init-webhook",
    customerId: "initech",
    author: { ...fde },
    text: "Yep, on Q3 roadmap. Want me to share the spec when it's ready?",
    channel: "#initech",
    ts: hoursAgo(20 * 24),
  },
];

// ---------- HOOLI ---------- (medium risk, stalled onboarding)
const hooliMessages: Message[] = [
  {
    id: "m-hooli-1",
    ticketId: "t-hooli-onboard",
    customerId: "hooli",
    author: { name: "Gavin Belson", handle: "gavin", isInternal: false },
    text: "we joined a few weeks ago — is there a setup checklist?",
    channel: "#hooli-onboarding",
    ts: hoursAgo(28 * 24),
  },
  {
    id: "m-hooli-2",
    ticketId: "t-hooli-onboard",
    customerId: "hooli",
    author: { ...fde },
    text: "Sent over the onboarding doc — let me know once you've connected your first data source.",
    channel: "#hooli-onboarding",
    ts: hoursAgo(27 * 24),
  },
  {
    id: "m-hooli-3",
    ticketId: "t-hooli-onboard",
    customerId: "hooli",
    author: { name: "Gavin Belson", handle: "gavin", isInternal: false },
    text: "got it, will take a look",
    channel: "#hooli-onboarding",
    ts: hoursAgo(27 * 24),
  },
];

// ---------- WAYNE ---------- (low risk, healthy)
const wayneMessages: Message[] = [
  {
    id: "m-wayne-1",
    ticketId: "t-wayne-feature",
    customerId: "wayne",
    author: { name: "Lucius Fox", handle: "lucius", isInternal: false },
    text: "the new dashboard widgets are working great. team loves them.",
    channel: "#wayne-enterprises",
    ts: hoursAgo(18),
  },
  {
    id: "m-wayne-2",
    ticketId: "t-wayne-feature",
    customerId: "wayne",
    author: { ...fde },
    text: "Glad to hear! Let me know if you want a walkthrough of the new alerting rules.",
    channel: "#wayne-enterprises",
    ts: hoursAgo(16),
  },
];

// ---------- STARK ---------- (low risk, casual noise)
const starkMessages: Message[] = [
  {
    id: "m-stark-1",
    ticketId: "t-stark-chat",
    customerId: "stark",
    author: { name: "Pepper Potts", handle: "pepper", isInternal: false },
    text: "happy friday everyone 🎉",
    channel: "#stark-industries",
    ts: hoursAgo(6),
  },
  {
    id: "m-stark-2",
    ticketId: "t-stark-chat",
    customerId: "stark",
    author: { name: "Tony Stark", handle: "tony", isInternal: false },
    text: "btw the dark mode looks great",
    channel: "#stark-industries",
    ts: hoursAgo(4),
  },
];

const tickets: Ticket[] = [
  {
    id: "t-acme-login",
    customerId: "acme",
    title: "Login returns 500 on production",
    summary:
      "Multiple users reporting login failures with 500 errors over 3 days. 4 message variants, no FDE response in last 36h.",
    status: "needs_reply",
    severity: "high",
    ageHours: 72,
    stalled: true,
    createdAt: hoursAgo(72),
    updatedAt: hoursAgo(8),
    messages: acmeMessages.filter((m) => m.ticketId === "t-acme-login"),
    nextStep:
      "Reply to Alice acknowledging the outage and check production auth logs for 500s on /v1/sessions.",
  },
  {
    id: "t-acme-sso",
    customerId: "acme",
    title: "SAML configuration reverts after save",
    summary: "Carla reports SAML config not persisting. FDE asked for IdP metadata 26h ago — both sides engaged.",
    status: "active",
    severity: "medium",
    ageHours: 28,
    stalled: false,
    createdAt: hoursAgo(28),
    updatedAt: hoursAgo(26),
    messages: acmeMessages.filter((m) => m.ticketId === "t-acme-sso"),
    nextStep: "Follow up with Carla for IdP metadata XML.",
  },
  {
    id: "t-glob-payment",
    customerId: "globex",
    title: "Failed payment blocking integrations",
    summary:
      "Card-on-file payment failed; integrations paused. VP Eng escalated 6h ago. No internal response yet.",
    status: "needs_reply",
    severity: "high",
    ageHours: 36,
    stalled: true,
    createdAt: hoursAgo(36),
    updatedAt: hoursAgo(6),
    messages: globexMessages.filter((m) => m.ticketId === "t-glob-payment"),
    nextStep:
      "Verify card status with billing team and unpause integrations; reply to Eva within the hour.",
  },
  {
    id: "t-glob-export",
    customerId: "globex",
    title: "CSV export times out on large accounts",
    summary: "Streaming fix shipped to staging. Awaiting customer retest confirmation.",
    status: "waiting_customer",
    severity: "medium",
    ageHours: 96,
    stalled: false,
    createdAt: hoursAgo(96),
    updatedAt: hoursAgo(48),
    messages: globexMessages.filter((m) => m.ticketId === "t-glob-export"),
    nextStep: "Ping Derek for retest result on the staging fix.",
  },
  {
    id: "t-init-quiet",
    customerId: "initech",
    title: "Drop in engagement",
    summary:
      "Initech sent 2 messages in the last 14 days, down from a 3-week average of 18. No open issues, but unusual silence.",
    status: "needs_reply",
    severity: "medium",
    ageHours: 14 * 24,
    stalled: true,
    createdAt: hoursAgo(14 * 24),
    updatedAt: hoursAgo(14 * 24),
    messages: initechMessages.filter((m) => m.ticketId === "t-init-quiet"),
    nextStep: "Reach out to Michael for a 15-min check-in; ask about adoption blockers.",
  },
  {
    id: "t-init-webhook",
    customerId: "initech",
    title: "Webhook auto-retry feature request",
    summary: "Customer asked about auto-retry for failed webhooks. FDE confirmed Q3 roadmap.",
    status: "waiting_customer",
    severity: "low",
    ageHours: 21 * 24,
    stalled: false,
    createdAt: hoursAgo(21 * 24),
    updatedAt: hoursAgo(20 * 24),
    messages: initechMessages.filter((m) => m.ticketId === "t-init-webhook"),
    nextStep: "Share the Q3 spec with Samir once finalized.",
  },
  {
    id: "t-hooli-onboard",
    customerId: "hooli",
    title: "Onboarding stalled at data source connection",
    summary:
      "Joined 28 days ago. Onboarding doc shared. No data source connected. No follow-up since day 1.",
    status: "needs_reply",
    severity: "medium",
    ageHours: 28 * 24,
    stalled: true,
    createdAt: hoursAgo(28 * 24),
    updatedAt: hoursAgo(27 * 24),
    messages: hooliMessages.filter((m) => m.ticketId === "t-hooli-onboard"),
    nextStep:
      "Schedule 30-min onboarding session with Gavin; offer to do the first data source connection live.",
  },
  {
    id: "t-wayne-feature",
    customerId: "wayne",
    title: "Positive feedback on dashboard widgets",
    summary: "Lucius shared positive sentiment on the new widget release. FDE offered alerting walkthrough.",
    status: "resolved",
    severity: "low",
    ageHours: 18,
    stalled: false,
    createdAt: hoursAgo(18),
    updatedAt: hoursAgo(16),
    messages: wayneMessages.filter((m) => m.ticketId === "t-wayne-feature"),
    nextStep: "Optional: schedule alerting walkthrough next week.",
  },
  {
    id: "t-stark-chat",
    customerId: "stark",
    title: "Casual channel chatter",
    summary: "Friendly non-actionable messages. No issue inferred.",
    status: "resolved",
    severity: "low",
    ageHours: 6,
    stalled: false,
    createdAt: hoursAgo(6),
    updatedAt: hoursAgo(4),
    messages: starkMessages.filter((m) => m.ticketId === "t-stark-chat"),
    nextStep: "No action needed.",
  },
];

const countTickets = (customerId: string) => {
  const counts = {
    needs_reply: 0,
    active: 0,
    waiting_customer: 0,
    resolved: 0,
  } as Record<Ticket["status"], number>;
  tickets.filter((t) => t.customerId === customerId).forEach((t) => {
    counts[t.status] += 1;
  });
  return counts;
};

const customers: Customer[] = [
  {
    id: "acme",
    name: "Acme Corp",
    domain: "acme.com",
    plan: "enterprise",
    csm: "Priya Shah",
    risk: "high",
    riskScore: 87,
    riskExplanation:
      "3-day-old login outage with 4 unresolved messages and no FDE reply in 36h. Compounding silence.",
    trend: "up",
    recentSignal: "\u201cping — login is still throwing 500s\u201d — Alice (8h ago)",
    nextAction:
      "Reply to Alice acknowledging the outage and check production auth logs for 500s on /v1/sessions.",
    lastActivityAt: hoursAgo(8),
    joinedAt: hoursAgo(380 * 24),
    ticketCounts: countTickets("acme"),
  },
  {
    id: "globex",
    name: "Globex",
    domain: "globex.io",
    plan: "growth",
    csm: "Priya Shah",
    risk: "high",
    riskScore: 81,
    riskExplanation:
      "Failed payment paused integrations; VP Eng escalated 6h ago with no response. Production-blocking.",
    trend: "up",
    recentSignal:
      "\u201cwe need this resolved today or we're escalating internally\u201d — Eva (VP Eng, 6h ago)",
    nextAction: "Verify card status with billing and unpause integrations; reply to Eva within the hour.",
    lastActivityAt: hoursAgo(6),
    joinedAt: hoursAgo(220 * 24),
    ticketCounts: countTickets("globex"),
  },
  {
    id: "hooli",
    name: "Hooli",
    domain: "hooli.xyz",
    plan: "growth",
    csm: "Priya Shah",
    risk: "medium",
    riskScore: 58,
    riskExplanation:
      "Onboarding stalled — 28 days in, no data source connected, no follow-up since day one.",
    trend: "flat",
    recentSignal: "\u201cgot it, will take a look\u201d — Gavin (27d ago)",
    nextAction:
      "Schedule a 30-min onboarding session with Gavin; offer to do the first data source connection live.",
    lastActivityAt: hoursAgo(27 * 24),
    joinedAt: hoursAgo(28 * 24),
    ticketCounts: countTickets("hooli"),
  },
  {
    id: "initech",
    name: "Initech",
    domain: "initech.co",
    plan: "starter",
    csm: "Priya Shah",
    risk: "medium",
    riskScore: 52,
    riskExplanation:
      "Engagement dropped 89% over 14 days. No open issues, but the silence is unusual for them.",
    trend: "down",
    recentSignal: "\u201cthanks, that worked\u201d — Michael (14d ago)",
    nextAction: "Reach out to Michael for a 15-min check-in; ask about adoption blockers.",
    lastActivityAt: hoursAgo(14 * 24),
    joinedAt: hoursAgo(540 * 24),
    ticketCounts: countTickets("initech"),
  },
  {
    id: "wayne",
    name: "Wayne Enterprises",
    domain: "wayne.com",
    plan: "enterprise",
    csm: "Priya Shah",
    risk: "low",
    riskScore: 18,
    riskExplanation: "Active engagement, positive sentiment, no open issues.",
    trend: "down",
    recentSignal: "\u201cthe new dashboard widgets are working great\u201d — Lucius (18h ago)",
    nextAction: "Optional: schedule alerting walkthrough next week.",
    lastActivityAt: hoursAgo(16),
    joinedAt: hoursAgo(700 * 24),
    ticketCounts: countTickets("wayne"),
  },
  {
    id: "stark",
    name: "Stark Industries",
    domain: "stark.com",
    plan: "enterprise",
    csm: "Priya Shah",
    risk: "low",
    riskScore: 12,
    riskExplanation: "Casual chatter only. No risk signals detected.",
    trend: "flat",
    recentSignal: "\u201cbtw the dark mode looks great\u201d — Tony (4h ago)",
    nextAction: "No action needed.",
    lastActivityAt: hoursAgo(4),
    joinedAt: hoursAgo(900 * 24),
    ticketCounts: countTickets("stark"),
  },
];

export const fixtures = { customers, tickets };

export const getCustomers = () =>
  [...customers].sort((a, b) => b.riskScore - a.riskScore);

export const getCustomer = (id: string) =>
  customers.find((c) => c.id === id);

export const getTicketsForCustomer = (customerId: string) =>
  tickets.filter((t) => t.customerId === customerId);

export const getTicket = (id: string) => tickets.find((t) => t.id === id);

export type Channel = {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  lastTs: string;
  preview: string;
};

const channelNameFor = (customerId: string) => {
  const map: Record<string, string> = {
    acme: "acme-support",
    globex: "globex-success",
    initech: "initech",
    hooli: "hooli-onboarding",
    wayne: "wayne-enterprises",
    stark: "stark-industries",
  };
  return map[customerId] ?? customerId;
};

export const getChannels = (): Channel[] =>
  customers
    .map((c) => {
      const msgs = tickets
        .filter((t) => t.customerId === c.id)
        .flatMap((t) => t.messages)
        .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      const last = msgs[0];
      return {
        id: c.id,
        name: channelNameFor(c.id),
        customerId: c.id,
        customerName: c.name,
        lastTs: last?.ts ?? c.lastActivityAt,
        preview: last?.text ?? "",
      };
    })
    .sort((a, b) => new Date(b.lastTs).getTime() - new Date(a.lastTs).getTime());

export const getMessagesForChannel = (channelId: string) =>
  tickets
    .filter((t) => t.customerId === channelId)
    .flatMap((t) => t.messages)
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

export const getChannel = (channelId: string): Channel | undefined =>
  getChannels().find((c) => c.id === channelId);

