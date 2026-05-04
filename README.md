# Nixo — Customer Risk Dashboard

A Forward-Deployed Engineer's triage dashboard. It ingests Slack-style customer messages, uses an LLM to extract grouped tickets and score them on five severity features, and surfaces who's at risk and what to do next.

Built with:

- **Next.js 16** — frontend
- **FastAPI + Python 3** — backend
- **OpenAI API** — four-step LLM pipeline (event extraction, status assignment, severity feature extraction, real-time message routing)

## How to run

```bash
# 1. Clone
git clone https://github.com/notaaryansh/nixo-takehome.git
cd nixo-takehome

# 2. Add your OpenAI key
cp backend/.env.example backend/.env
# open backend/.env and set:
#   OPENAI_API_KEY=sk-...your-key-here

# 3. Start both servers
./run_local.sh
```

The script creates a Python venv, installs backend deps (`pip install -r backend/requirements.txt`), installs frontend deps (`npm install`), then starts:

- **Frontend** → http://localhost:3000
- **Backend**  → http://localhost:8000  (interactive API docs at `/docs`)

`Ctrl+C` stops both cleanly.

### First-time use

The dashboard **auto-runs the pipeline** on first load when the backend has no events — extracting tickets, scoring features, and computing customer risk from `backend/data/raw_data.json`.

Subsequent visits use cached state and a 5-second poll, so the page feels live without re-running the pipeline.

To send a fresh message into the system, open the **Messaging** tab (Slack-style UI), pick a persona from the dropdown, type, and hit send. The backend routes the message (`attach` / `create` / `drop`), re-scores the affected ticket, and the dashboard reflects the change within ~5s.

## Real-time events

The backend currently uses an **in-memory Python store** (`backend/app/store.py`). We chose this for the takehome because it keeps the moving parts to a minimum — no migrations, no connection pool, no SQL — and lets the LLM pipeline be the focus.

Swapping in real Slack would mean adding a thin **WebSocket / Events API listener** that:

1. Translates Slack `message.channels` payloads into our internal `Message` shape, and
2. Pipes them through the same `POST /messages` handler we already use for the in-app composer (`backend/app/main.py:60`).

Everything downstream — routing, enrichment, severity scoring, customer rollup — stays unchanged because the ingestion contract is already abstracted.

### Store structure

`InMemoryStore` (a singleton initialized at module load) holds three collections:

- **`messages: list[Message]`** — every raw message ever ingested, hydrated from `data/raw_data.json` on startup. Keyed by `id`, queryable by `channel`, `sender`, or `role`.
- **`events: list[Event]`** — derived "tickets" produced by the LLM pipeline. Each event carries a `message_ids` list (the client messages it groups), an LLM-assigned `status`, an LLM-extracted `TicketFeatures` blob (urgency / consequence / sentiment + deterministic frequency / escalation), a `severity_label` rolled up from those features, and an `updated_at` bumped on every enrichment.
- **`customer_risks: dict[channel → CustomerRisk]`** — per-channel risk level, computed deterministically from the highest open-ticket severity (resolved tickets are excluded from the rollup, so a customer with all tickets closed is `low` regardless of past severity).

When a new message arrives via `POST /messages`, the backend (`pipeline.py:process_new_message`) runs this flow:

1. **Persist** the raw message to `store.messages`.
2. **Route** it via the `ROUTE_MESSAGE` LLM prompt against the channel's currently-open tickets — the model returns one of `attach` (continues an existing ticket), `create` (new client concern), or `drop` (off-topic chatter).
3. **Mutate** the affected event: client-message attaches append to `event.message_ids`; engineer attaches don't (engineer messages aren't part of "what the customer reported"), but both still trigger `_enrich_event`, which re-runs status assignment + feature extraction in parallel and bumps `event.updated_at`.
4. **Re-rollup** the customer's risk level by re-reading their open tickets' severities.
5. **Return** the routing decision + the (possibly newly-created) event to the client; the frontend's 5-second poll then surfaces the change in the dashboard.

### Improvements

In production this would move off the in-memory store. The natural shape:

- **Swap to PostgreSQL** for `messages`, `events`, and `customer_risks`.
  - Three tables with foreign keys: `event.channel → channel.id`, `event_message` join table, `customer_risk.channel → channel.id`.
  - Indexes on `(channel, timestamp)` for fast context-window queries.
  - A `tsvector` column on `message.content` for the LLM-prompt assembly we currently do in Python.
- **Trigger-driven enrichment** via Postgres `LISTEN/NOTIFY` (or a job queue like Celery / RQ / BullMQ).
  - Message inserts fan out to a worker that runs `assign_status` + `extract_features` asynchronously.
  - Keeps `POST /messages` snappy and lets us retry failed LLM calls with backoff.
- **Real Slack adapter** — a small service that holds the Slack socket-mode connection, normalizes `message.channels` events to our `Message` schema, and re-uses `POST /messages` as its sink. With auth on top, the same path could accept multiple workspaces.
- **Realtime UI push** — replace the 5-second poll with an SSE or WebSocket fan-out from the backend so the dashboard updates the moment an event is enriched, not within the next polling tick.

## How we define risk

In this app, **"risk" and "severity" are used interchangeably**. We chose to ground risk in severity rather than treat it as a separate abstract dimension because severity is something we can actually measure from the conversation; "risk" without a definition tends to drift into vibes.

Customer-level risk is the deterministic rollup of the highest open-ticket severity. Resolved tickets are excluded — a customer with everything closed out is `low` risk regardless of past severity.

The pipeline takes raw client messages and produces tickets — that part is the AI's job (detailed in the *AI analysis* section below). Once tickets exist, ranking them is the job of this section.

Every ticket carries a bundle of metadata: a heading, summary, type (`bug` / `feature_request` / `question`), status (`needs_reply` / `active` / `waiting_on_customer` / `resolved`), `next_step`, and a `features` blob. All of this metadata is AI-driven (again, see the AI section).

What this section cares about: given that metadata, **how do we turn it into a single severity label**, and how do customer-level risk levels emerge from those labels?

### Features and score

A ticket's severity is computed from five 0-3 features. Three are LLM-extracted, two are deterministic from message metadata:

| Feature | Source | What it measures |
|---|---|---|
| `urgency` | LLM | How quickly should this be resolved? ("ASAP", "blocking", "no rush") |
| `consequence` (Impact) | LLM | If ignored, how much damage results? (cosmetic vs. production-down) |
| `sentiment` | LLM | Emotional tone (calm → frustrated → churn-implying) |
| `messages` (Frequency) | deterministic | Bucketed count of client messages on the ticket |
| `people` (Escalation) | deterministic | Bucketed count of distinct client senders on the ticket |

Score is the **simple sum**: `score = urgency + consequence + sentiment + messages + people`, range 0-15. Bucketed via thresholds:

- `score ≥ 8` → **high**
- `score ≥ 4` → **medium**
- otherwise   → **low**

Plus a **per-feature escape hatch** on the LLM dimensions: if any one of `urgency`, `consequence`, or `sentiment` hits `3` — meaning the customer's language tripped the loudest threshold in the prompt ("blocking / production down", "data loss / churn risk", or "considering alternatives") — severity is forced to `high` regardless of the sum. One critical signal beats breadth-of-signals.

### Limitations

**1. No temporal awareness.**

The severity score is a snapshot of the ticket's current state — it doesn't model behavior over time.

A customer who messaged daily and went silent for two weeks should be flagged ("low engagement / churn risk"), but our scoring has no place to put that signal because there's no event to attach it to. Same with response-time SLAs, time-since-last-FDE-reply, or reopened-issue patterns.

Adding a temporal layer (per-customer rolling stats + decay-weighted features) is the highest-impact next step.

**2. A linear sum is still a naive aggregator.**

We treat all five features as equally weighted and just add them up. That works most of the time but loses information about *which* dimensions are firing.

The clearest failure mode is volume features dominating low-signal tickets. Example: a customer where 4+ teammates send 4+ messages on a normal-cadence question (`messages=3, people=3, urgency=1, consequence=1, sentiment=1`) sums to `9` and lands as `high` — but it's a chatty thread on a routine ask, not a real crisis. The escape hatches catch the loud-*customer* cases; they don't catch the loud-*channel* cases.

Possible fixes:

- A weighted sum (LLM features ×2, volume ×1).
- Pairwise interaction terms.
- Capping the volume contribution.

Picking one well requires analyzing thousands of samples and validating against an FDE-labeled dataset — not something to guess at on a takehome.

**3. Five features isn't enough.**

Missing dimensions worth scoring:

- **Sender seniority** — a VP joining the thread is a much louder signal than another engineer.
- **Explicit churn / competitor / legal language.**
- **Time-since-last-FDE-reply** against an account-tier SLA.
- **Reopened-issue count.**
- **Sentiment trajectory** across time.
- **Engagement-volume change** (delta vs trailing average).

Most of these are customer-level signals (not per-ticket), which is why expanding the scoring layer is coupled with the temporal-awareness gap above.

## AI analysis

The AI layer takes a stream of aggregated client/engineer messages — assumed to already be normalized into our internal `Message` shape (preparing that data is discussed in the next section) — and turns it into structured tickets with status, severity features, and a recommended next step.

We treat the LLM as a **sensor**, not a **judge**:

- Every call returns strict JSON with bounded output (an enum, an integer 0-3, a list of message ids).
- The deterministic Python layer above it does the actual decision-making (severity score, customer rollup, ticket-status priority sort).

### The four LLM calls

| Call | When it runs | Input | Output |
|---|---|---|---|
| `EXTRACT_EVENTS` | once per channel during a full pipeline run | all client-side messages in the channel | a list of events, each with `heading`, `summary`, `type` (`bug` / `feature_request` / `question`), and the `message_ids` it groups |
| `ASSIGN_STATUS` | per event, on every enrichment pass | the event + a 5-message context window from the channel | `status` (`needs_reply` / `active` / `waiting_on_customer` / `resolved`) and a concrete `next_step` for the FDE |
| `EXTRACT_TICKET_FEATURES` | per event, on every enrichment pass | the event's heading + summary + the client messages it contains | three integer scores 0-3: `urgency`, `consequence`, `sentiment` |
| `ROUTE_MESSAGE` | per new message, in real time on `POST /messages` | the new message + the list of currently-open tickets in its channel | one of `{attach, create, drop}` plus a one-line reason; if `attach`, the target `event_id`; if `create`, a stub `new_event` payload |

### How they compose

Two paths use these four calls — a **batch** path (initial pipeline / full re-extraction) and a **real-time** path (every inbound message):

```
                                  raw messages in store.messages
                                          │
              ───────────────────────────┴───────────────────────────
              │                                                       │
              ▼  BATCH PATH                                            ▼  REAL-TIME PATH
   ┌──────────────────────┐                                ┌──────────────────────┐
   │   EXTRACT_EVENTS     │  per channel                   │   ROUTE_MESSAGE      │  per message
   │   (groups + types)   │                                │   attach/create/drop │
   └──────────┬───────────┘                                └──────────┬───────────┘
              │ creates event(s)                                      │ creates or selects event
              ▼                                                       ▼
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │                            _enrich_event (parallel)                          │
   │   ┌──────────────────┐                            ┌──────────────────┐       │
   │   │  ASSIGN_STATUS   │                            │ EXTRACT_FEATURES │       │
   │   │  status + next   │                            │  urgency / cons- │       │
   │   │  step            │                            │  equence / senti.│       │
   │   └──────────────────┘                            └──────────────────┘       │
   └────────────────────────────────────┬─────────────────────────────────────────┘
                                        │
                                        ▼
                        deterministic Python (no LLM):
                        severity = naive_sum + escape_hatch
                        customer.risk = max(open ticket severities)
                        bumps event.updated_at
```

Two important design choices fall out of this layout:

**The LLM never decides risk.**

The four calls above output enums and 0-3 ints. The actual severity label, the customer-level risk rollup, and the per-status priority sort are all done in plain Python (`pipeline.py:calculate_severity`, `rollup_risk_level`).

That keeps the decision layer auditable, tunable without re-prompting, and instantly comparable across tickets — and means a flaky LLM response can't cascade into a wrongly-ranked dashboard.

**Real-time and batch share an enrichment chokepoint.**

Whether an event was just extracted by `EXTRACT_EVENTS` (batch) or just modified by `ROUTE_MESSAGE` (real-time attach), it goes through the same `_enrich_event(event)` function, which fans out `ASSIGN_STATUS` + `EXTRACT_FEATURES` in parallel via `asyncio.gather`.

One place to change if we ever add a fourth per-event LLM call (e.g., a "draft reply" or a "find related tickets" pass).

### Scaling

**Where we are today.** The pipeline already uses `AsyncOpenAI` with `await` everywhere (`ai.py`), so a single FastAPI worker can have many in-flight OpenAI calls concurrently:

- `_enrich_event` runs `ASSIGN_STATUS` and `EXTRACT_FEATURES` in parallel via `asyncio.gather`.
- `extract_events_for_all_channels` parallelises across channels the same way.

Async I/O is the right shape for inside one process.

**What async doesn't fix.** Three problems remain at scale, none of them async-vs-sync issues:

1. **Request coupling** — the user blocks on `POST /messages` until the chain (`ROUTE_MESSAGE` → `_enrich_event` → customer rollup) completes (~1-3s tail).
2. **Single-process ceiling** — one uvicorn worker tops out at its event-loop / CPU limit.
3. **No durability** — a transient OpenAI 5xx becomes a hard request error rather than a retried operation.

The natural shape at scale is **SQS + Lambda** to break the request coupling, and **SSE** to replace polling on the client side.

#### SQS + Lambda for the AI pipeline

- **`POST /messages` becomes an enqueue.** The handler validates the payload, drops it into an SQS queue (`messages-incoming`), and returns `202 Accepted` immediately.
  - User-perceived latency goes from 1-3s to tens of milliseconds.
  - The LLM chain leaves the request path entirely; a slow OpenAI tail no longer pins the worker.

- **One Lambda per pipeline step.** `route-message`, `extract-events`, `assign-status`, `extract-features` each consume their own queue.
  - `route-message` decides attach/create/drop and either updates the event row in Postgres or publishes to `events-needing-enrichment`.
  - The enrichment Lambdas fan out `ASSIGN_STATUS` and `EXTRACT_FEATURES` in parallel within each invocation (just like today).
  - Each queue hop gets SQS's retry + DLQ behavior automatically — a flaky OpenAI response retries with backoff instead of losing data.

- **Horizontal scale = queue concurrency.** Lambda concurrency limits + SQS visibility timeouts give back-pressure and elasticity for free.
  - Spike from 10 messages/min to 1000 → Lambdas scale out, queue drains, no infra change.
  - OpenAI per-account rate limits become the actual ceiling — at which point you split work across multiple OpenAI orgs or add a token-bucket throttler in front of the queue.

#### SSE for client fan-out

The 5-second poll works for a handful of tabs but burns request volume linearly with users (`N clients × every-5s × every endpoint`).

Replace it with **per-customer SSE channels** (`/sse/customers/{channel}/events`):

- The API holds a persistent connection per subscriber.
- When a Lambda finishes enrichment and writes Postgres, it publishes a small event (`{event_id, status, severity_label, updated_at}`) to Redis pub/sub or DynamoDB Streams.
- The API server subscribes to that stream and fans out only to clients currently watching that customer.
- Frontend swaps `<PollRefresh>` for `useEventSource(...)` — the rest of the rendering layer is unchanged because the server emits the same JSON shapes, just push instead of pull.

#### End-to-end at scale

```
Slack adapter / live composer
    → API enqueues
    → Lambda pipeline writes Postgres
    → pub/sub notifies API
    → SSE pushes to subscribed clients
```

Each hop is independently scalable, retryable, and observable.

## Data preparation

This is the layer that sits between raw incoming messages and the structured tickets the analysis layer scores. Its job:

- **Group** related client messages into single tickets.
- **Degroup** noise (greetings, acknowledgements, off-topic chatter).
- **Keep the ticket boundary stable** across both batch processing and real-time arrivals.

The grouping logic is LLM-driven (not regex / keyword matching) and runs in two phases that share the same definition of what counts as a "concern."

#### Phase 1 — `EXTRACT_EVENTS`

Runs once per channel during a full pipeline re-extraction. It sees only client-side messages (engineer replies are filtered out at the Python layer before the LLM sees them, since engineers don't *raise* concerns) and emits one event per topic.

The grouping is topic-driven, not sender- or time-driven:

- One ticket can span three messages from two different teammates if they're all about the same OOM bug.
- Conversely, a single client message that genuinely raises two distinct concerns produces two events, with the same `message_id` appearing in both `message_ids` lists.

The prompt gives the LLM *examples* of what to drop (`👋 morning everyone`, `thanks!`, "the new dashboard looks great", weekend chatter), plus a litmus test:

> *"Would the customer be unhappy if you simply replied with a smiley? If yes → it's a real ask. If no → it's chatter."*

The actual classification is the LLM's call, applied per message, so it handles mixed cases like *"thanks for the fix, btw the dashboard is broken"* correctly (keep it) without a brittle string matcher.

#### Phase 2 — `ROUTE_MESSAGE`

Runs per inbound message in real time and decides whether the new message:

- **Attaches** to an existing open ticket,
- **Creates** a new one, or
- Gets **dropped**.

Engineer messages can only attach or be dropped — never create.

The drop rules mirror Phase 1, so a standalone *"thanks Priya!"* from a client almost certainly never appears on the dashboard whether it arrived during the historical extraction or as a live ping.

#### Why two phases stay consistent

The two phases share the same prompted notion of a concern, so the ticket boundary doesn't drift between batch and real-time:

- Phase 1 **rebuilds from scratch** when a full re-extraction runs.
- Phase 2 **keeps the ticket set stable** as new messages flow in — no renumbering, no re-shaping anything the FDE has already started replying to.
