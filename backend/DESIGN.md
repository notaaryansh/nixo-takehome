# Backend Design

A FastAPI + async-OpenAI service that turns raw Slack-style messages from enterprise client channels into a triage view for a forward-deployed engineer (FDE). Everything is in-memory; no database.

---

## Problem framing

A forward-deployed engineer monitors several Slack channels with enterprise customers. The signal is buried in noise: greetings, acks, jokes, repeated pings, multi-person threads, and the occasional real fire. The backend's job is to:

1. Identify which messages constitute a tracked **concern** (an "event"/"ticket").
2. Group multi-message threads into a single event; split single messages that bundle multiple distinct asks.
3. Enrich every event with a status (where the ball is), a concrete next step, and a severity score derived from observable features.
4. Roll up per-ticket severity to a per-customer risk level.
5. Route newly-arrived messages in real time — attach to an existing open ticket, create a new one, or drop as chatter.

The whole system is structured to be cheap to inspect and easy to swap LLM-backed steps for deterministic ones (and vice versa) as we learn what's reliable.

---

## Layout

```
backend/
  data/raw_data.json     — sample channel messages (19 messages across 4 channels)
  app/
    main.py              — FastAPI app + HTTP routes (slim)
    cli.py               — terminal demo runner (asyncio.run entrypoint)
    models.py            — Pydantic schemas
    store.py             — InMemoryStore (messages, events, customer_risks)
    ai.py                — AsyncOpenAI client wrapper (call_llm)
    pipeline.py          — extraction, enrichment, routing, rollup
    prompts.py           — system prompts (versioned in source)
```

Run modes:
- API: `uvicorn app.main:app --port 8000`
- Demo: `python -m app.cli`

---

## Data model

Three first-class objects.

### `Message`

```python
{
  id: str,
  sender: str,            # human name, e.g. "Susan", or "You" for the engineer
  role: "client" | "engineer",
  content: str,
  channel: str,           # e.g. "acme-corp"
  timestamp: str,         # ISO-8601 UTC
}
```

`role` is the disambiguator the LLM and the deterministic filters lean on. `sender` is preserved as the human display name.

### `Event` (a "ticket")

```python
{
  id: str,                # "evt_001", monotonic per process
  heading: str,           # short title, ≤ 8 words
  summary: str,           # 1-2 sentences across all messages
  type: "bug" | "feature_request" | "question",
  message_ids: list[str], # all client messages belonging to this concern
  sender: str,            # first sender (client teammate)
  channel: str,
  timestamp: str,         # earliest message timestamp (creation time)
  updated_at: str | None, # last enrichment time — set/bumped by _enrich_event
  status: "needs_reply" | "active" | "waiting_on_customer" | "resolved" | None,
  next_step: str | None,  # one specific action the engineer should take
  features: TicketFeatures | None,
}
```

A single client message can appear in multiple events' `message_ids` lists when it bundles distinct concerns (e.g. "the export endpoint is timing out, and while you're in there, can you add a date filter?" → one bug event + one feature_request event, both pointing at the same source id).

`updated_at` is the "last meaningfully changed" timestamp. It's only ever written from inside `_enrich_event`, which is the chokepoint for all state changes (initial extraction, message attach, status reassignment, feature recomputation). That makes "updated 2h ago" in the UI accurate without scattering timestamp writes across the codebase.

### `TicketFeatures` (per-ticket severity inputs)

```python
{
  messages: int,          # 0-3, deterministic bucket of message count
  people: int,            # 0-3, deterministic bucket of distinct client senders
  urgency: int,           # 0-3, LLM
  consequence: int,       # 0-3, LLM
  sentiment: int,         # 0-3, LLM
  severity_score: int,    # 0-15, sum of the five features
  severity_label: "low" | "medium" | "high",
}
```

Two features are deterministic (free, exact, repeatable); three are LLM-scored from the client message text.

### `CustomerRisk`

```python
{
  channel: str,
  risk_level: "low" | "medium" | "high",  # max-rolled from open ticket severities
}
```

Currently a pure deterministic rollup. An earlier version had the LLM also produce a one-line explanation and "most relevant signal"; that was removed in favor of the rollup so the customer-level signal is always internally consistent with the per-ticket severity bars.

---

## Storage

`InMemoryStore` (singleton in `store.py`) holds three collections:

- `messages: list[Message]` — loaded from `data/raw_data.json` at module import; new messages appended at runtime.
- `events: list[Event]` — populated by the pipeline; reset to `[]` at the start of each `/pipeline/run`.
- `customer_risks: dict[str, CustomerRisk]` — populated alongside events; reset on each run.

Restart wipes everything except `raw_data.json`. Persistence is the next thing to add (Phase 2 of the roadmap), and the `InMemoryStore` interface was deliberately shaped so the swap to SQLite/Postgres only changes one module.

Helper methods worth knowing:
- `store.get_messages(channel=, sender=, role=)` — filtered fetch.
- `store.get_context(message_ids, window=5)` — for a given event's message ids, returns the channel's surrounding messages (±5 by timestamp, scoped to the same channel). Used by the status assigner so it can see whether the engineer responded on-topic.
- `store.next_event_id()` — `evt_NNN` ids generated server-side.

---

## LLM layer

`ai.py` wraps `AsyncOpenAI`. One async function, `call_llm(prompt, system, model="gpt-4o-mini", response_format=...)`, returns the raw string content. Every LLM call in the pipeline goes through this.

We're using `gpt-4o-mini` for cost. The pipeline does many parallel calls (one per ticket per enrichment step), so model latency is the dominant cost — async + `asyncio.gather` makes the whole pipeline run end-to-end in ~5 seconds for the current dataset.

---

## Prompts

Four system prompts live in `prompts.py`. They're versioned in source so changes are reviewable.

### `EXTRACT_EVENTS`

Input: client-only messages from a single channel.
Output: a list of events with `heading`, `summary`, `type`, `message_ids`.

Key behaviors built into the prompt:
- Group multiple client messages into one event when they share a topic (across different senders too — Susan reporting + Ben escalating = one event).
- Split a single message into multiple events if it raises distinct concerns; the same message id may appear in both events.
- Drop greetings, acks, compliments, friendly rhetorical curiosity, off-topic chatter. Concrete examples are in the prompt to anchor the LLM.

### `ASSIGN_STATUS`

Input: an event + a ±5 message context window from the same channel.
Output: `{ status, next_step }` in one call.

Why context-window based: the LLM needs to know whether the engineer responded on-topic. The prompt explicitly warns that context is noisy (temporally adjacent messages may be about a totally different topic) and instructs the model to use both timestamp ordering and topical relevance.

Five worked examples cover each status case plus the trickiest one: temporally-adjacent-but-unrelated context (which would otherwise confuse a naive reading).

`next_step` is required to be a concrete, doable-today action that references real people and specifics from the messages — not "follow up".

### `EXTRACT_TICKET_FEATURES`

Input: a ticket (heading, summary, type) + its client messages.
Output: `{ urgency, consequence, sentiment }`, each 0–3.

Anchors are explicit per score. Notable: `consequence == 3` covers not just "production down" but also "customer's internal users complaining", repeated occurrence ("third time this week"), and explicit priority bumps from the customer side — these signal escalating downstream impact in their org.

### `ROUTE_MESSAGE` (real-time)

Input: a new message + the current open tickets in its channel.
Output: `{ decision: "attach" | "create" | "drop", attach_to_event_id?, new_event?, reason }`.

Engineer messages default to ATTACH (they're part of the support conversation). Client messages can be any of the three. The prompt has worked examples for both roles. Engineer messages NEVER create tickets — even if no open ticket fits, prefer DROP.

---

## The batch pipeline (`POST /pipeline/run`)

Resets `events` and `customer_risks`, then:

```
extract_events_for_all_channels:
  for each channel (parallel):
    EXTRACT_EVENTS over client messages → list of events with ids/heading/summary/type/message_ids
  for each event (parallel):
    _enrich_event:
      assign_status      ┐
                         ├ asyncio.gather (one round-trip)
      extract_features   ┘
      event.updated_at = now()       # single-write chokepoint
synthesize_all_customers:
  for each channel:
    rollup_risk_level(events_in_channel) → low/medium/high
    store.set_customer_risk(...)
```

`asyncio.gather` parallelizes both the per-channel extraction and the per-event enrichment. With four channels and seven extracted events, end-to-end wall time is ~5s.

---

## Severity scoring

Per ticket. Five features, each 0–3.

| Feature | Source | 0 | 1 | 2 | 3 |
|---|---|---|---|---|---|
| `messages` | det. (count) | 1 msg | 2 | 3 | 4+ |
| `people` | det. (distinct senders) | 1 person | — (unused) | 2 | 3+ |
| `urgency` | LLM | none | normal | within a day | ASAP/blocking |
| `consequence` | LLM | trivial | mild | team blocked / partial outage | prod down / data loss / churn / contract risk / repeated occurrence / customer escalating internally |
| `sentiment` | LLM | neutral | mild frustration | clear annoyance | churn-implying |

Why `people=2` skips score 1: going from 1 person reporting to 2 is a meaningful signal jump (someone else cared enough to chime in); going from 2 to 3 is incremental. The bucket function captures that.

### Aggregation

```python
score = messages + people + urgency + consequence + sentiment   # 0..15

# Per-feature escape hatch on the LLM-extracted dimensions: any one of the three
# at maximum forces high, even if the rest of the signal is quiet.
if urgency == 3 or consequence == 3 or sentiment == 3:
    label = "high"
elif score >= 8:
    label = "high"
elif score >= 4:
    label = "medium"
else:
    label = "low"
```

Three escape hatches (one per LLM dimension) catch the case where one feature is screaming and the others are quiet — e.g. a single-message ticket from one person ("we're considering alternatives") that would otherwise sum to 3 and be labeled low. Each maps to the loudest threshold in its prompt: `urgency=3` ≈ "blocking / production down", `consequence=3` ≈ "data loss / churn risk", `sentiment=3` ≈ "considering alternatives".

Thresholds are tunable knobs. They were calibrated against the current sample data so the OOM thread (the only multi-message multi-person event) lands at `high`, single-message escalation-language tickets land at `medium`, and pure questions land at `low`.

---

## Customer risk rollup

```python
def rollup_risk_level(events):
    open_events = [e for e in events if e.status != "resolved"]
    severities = [e.features.severity_label for e in open_events if e.features]
    if not severities:
        return "low"
    return max severity by ordering low < medium < high
```

Only open tickets contribute. A customer with all tickets resolved is by definition low risk regardless of past severity. This was an explicit design choice — the rollup reflects the *current* state of the relationship, not its history.

The rollup is deterministic, which means the customer-level severity badge always agrees with the worst-open-ticket badge in the customer's ticket list. No ambiguity, no LLM disagreement run-to-run.

---

## Real-time routing (`POST /messages`)

A new message arrives; the system decides what to do with it.

```
process_new_message(message):
  1. Persist message to store
  2. Compute open_events for this channel
  3. ROUTE_MESSAGE LLM call: { decision, attach_to_event_id?, new_event?, reason }

  if decision == "drop":
      return ("dropped", reason)

  if decision == "attach":
      append message_id to the event's message_ids (client only)
      _enrich_event(event)            # re-run status + features
      synthesize_customer(channel)    # update rollup
      return ("attached", event)

  if decision == "create":
      assert message.role == "client" (engineers can't create)
      new event with heading/summary/type from LLM
      _enrich_event(event)
      synthesize_customer(channel)
      return ("created", event)
```

The router is the *only* LLM call needed for an attach (it picks the event); the subsequent `_enrich_event` is what re-runs status + feature scoring on the now-updated event. For a create, two LLM calls fire (router + the parallelized status/features).

This is the incremental version of the batch pipeline — instead of re-running everything, only the affected event is re-enriched, and only one customer's rollup is recomputed.

---

## HTTP surface

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | liveness check |
| GET | `/messages` | all messages, optional `?channel=` filter |
| GET | `/messages/{id}` | single message |
| POST | `/messages` | real-time ingest (route + enrich) |
| GET | `/channels` | distinct channel names |
| GET | `/events` | all events, optional `?channel=` filter |
| POST | `/pipeline/run` | batch: re-extract everything from raw_data |
| GET | `/risks` | all customer risk rollups |
| GET | `/customers/{channel}/risk` | one customer's rollup |

CORS is open in dev (allow any origin) so the Next frontend on a different port can call directly. All read endpoints are cache-busted at the frontend with `cache: "no-store"`.

---

## Trade-offs and known limits

- **No persistence.** Everything dies on restart. The `InMemoryStore` interface was kept narrow on purpose so a SQLite swap is a single-file change. Phase 2 of the roadmap.
- **No incremental batch.** `/pipeline/run` resets and re-extracts from scratch. The real-time `POST /messages` is the incremental path; the batch path is the "rebuild the world" path.
- **No decision audit trail.** Each LLM call is stateless. We don't store the prompt, response, or token cost per decision. For tuning prompts and chasing regressions you'd want this — easy to add a side-table per call.
- **No event merge / split mechanism.** Once two events exist, the system can't merge them. If the LLM mistakenly creates two events for the same concern in real-time mode, only a fresh `/pipeline/run` will re-cluster them. Real-world ops would need an explicit merge action plus a UI for the FDE to override.
- **Customer metadata is missing.** No SLA, plan tier, contract value, CSM assignment, or join date in the model. Several severity heuristics that would ideally fire (SLA breach, plan-weighted urgency) are stubbed because we don't have the inputs yet.
- **Severity thresholds are sample-calibrated.** Numbers (`>= 8 → high`, `>= 4 → medium`) were tuned against the small sample dataset. They'll need recalibration once we have a larger corpus or feedback signal from the FDE.
- **Router is greedy.** The real-time `ROUTE_MESSAGE` prompt picks one event to attach to; it doesn't surface "this message could plausibly belong to either evt_001 or evt_004 — which one?" cases. For ambiguity you'd want a confidence score or surface the top-k for human disambiguation.

---

## What we'd build next

Roughly in priority order:

1. **SQLite persistence** — replace `InMemoryStore` with a SQL-backed implementation; messages append-only, events + risks materialized.
2. **Decision log** — per LLM call, store {prompt, response, model, tokens, latency, parent_event_id}. Lets you reconstruct any classification and detect regressions when prompts change.
3. **Embedding-based attach pre-filter** — before the `ROUTE_MESSAGE` LLM call, embed the new message and shortlist matching open events by cosine similarity. Cheaper and faster than always asking the model.
4. **Customer metadata model** — plans, SLAs, CSM assignment. Unlocks SLA-pressure and plan-weighted severity terms that are currently stubbed.
5. **Merge action** — FDE-initiated merge of two events into one, with full message_id union and re-enrichment.
6. **Per-tenant rate-limit / channel sampling** — for noisy channels with hundreds of messages a day, a pre-filter that drops obvious chatter before any LLM touches it (regex for "thx", emoji-only, single-word acks).
7. **Event-driven ingestion** — a queue (Redis / SQS) keyed by channel for per-channel ordered processing; `POST /messages` becomes the worker target, not the user-facing endpoint.
