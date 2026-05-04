# AI Use

This entire app was built in a Claude Code session. I had the architecture, the data model, the scoring scheme, and the UX flow figured out before opening the editor — Claude was the execution layer that let me ship in a fraction of the time I'd otherwise have spent typing it out. The four transcripts below show the spectrum of how I leaned on it: a quick domain lookup, validating a design I already had in mind, a multi-file async refactor, and code generation that tied a backend change to a frontend adaptation note in one pass.

---

## Workflow

### What I was trying to build

The customer risk dashboard from the spec — a Slack-style ingestion layer, an LLM pipeline that turns raw client messages into grouped tickets with severity scores, and a Linear-styled FDE-facing UI on top. I split the work into a Python/FastAPI backend (in-memory store, async OpenAI calls) and a Next.js 16 frontend, with realtime via 5-second polling.

### How I prompted the AI

Most prompts were 5-6 sentences long: a clear statement of what I wanted built, the constraints, how it should fit into what already existed, and any edge cases I cared about. Concrete and intent-driven. I'd often paste a screenshot when the change was visual, or a stack trace when something broke.

The session structure was bimodal:

1. **Mapping pass** — for any non-trivial chunk of work, I'd describe the goal and walk through the implementation plan with the model so we agreed on the contract before any code got written. This was where the 5-6 sentence prompts lived.
2. **Polishing pass** — once the design was mapped out, the rest was running tests, hitting endpoints with `curl`, eyeballing screenshots, course-correcting the few details that came back wrong. Imperatives got terse here ("flip the resolved stripe to green", "drop the unread badges").

Patterns I leaned on within that loop:

- **"Validate with me"** — exploratory prompts to bounce a decision I'd already half-made off the model and pressure-test it ("here's how I'm thinking about scoring severity, what am I missing?"). Useful as a sanity check, not as the source of the answer.
- **Targeted clarifications** — one-shot lookups like *"what does sla mean"* mid-flow when domain vocabulary blocked me.

### What worked

- **Multi-file refactors** — the AsyncOpenAI switch (Example 3) touched six files atomically and didn't break anything; same for the severity score wire-up. I would've taken an hour to type the same diff.
- **Prompt engineering iteration on the in-app prompts** — when one of the LLM prompts inside `prompts.py` had a structural bug (e.g., the `ASSIGN_STATUS` few-shot examples not including the `next_step` field, so the model was omitting it in production), describing the symptom got me a fix faster than I'd have nailed it manually.
- **Design confirmation** — Example 4 is the canonical version of this. I went in already planning to compute the count features deterministically and put scaling on the LLM ones; bouncing the plan off the model articulated it back cleanly and let me approve implementation without second-guessing.
- **Cross-stack coordination** — when a backend change implied a frontend update, Claude would surface the contract delta as a clean note (Example 1). Saved me a context-switch and a re-read of the diff.

### What didn't

- **Next.js 16 specifics** — Claude's training had patterns from older versions that no longer applied (params being a Promise, `<PollRefresh>` patterns). It hit the `node_modules/next/dist/docs/` reference rather than guessing, but the first attempt occasionally needed a correction.
- **Tailwind v4 + CSS-var opacity modifiers** — the model produced `border-[var(--risk-high)]/50` which silently fails because the `/50` opacity modifier doesn't work with CSS variables. I had to switch to inline `style={{ borderColor: ... }}` to get the high-severity stripe to render at all.
- **Hot-reload assumptions** — Claude assumed uvicorn would pick up backend prompt changes automatically. Several times the running server was still using a cached prompt and the issue wasn't the code at all — required a manual restart.
- **Few-shot prompt traps** — when I asked for a structured JSON output with multiple fields, Claude wrote example outputs that omitted optional fields, which the LLM then imitated in production. Caught this twice (`next_step` in `ASSIGN_STATUS`, the `"bug | feature_request | question"` literal-pipe issue) by reading the actual API responses, not just the diff.

### How I validated / modified the output

- **Read every diff before accepting.** Most edits were small; reading them was faster than blindly trusting them. Caught a handful of off-by-one errors and stale references this way.
- **Run the dev server + hit endpoints.** `curl http://localhost:8000/events | python3 -m json.tool` was my main feedback loop for backend changes. For frontend changes, screenshots + click-throughs in the actual browser.
- **Probe with shaped scenarios.** When testing severity scoring, I'd send specific messages designed to trip an edge case ("hey ben looking into this right now" → does the FDE message correctly attach + flip status to active?). Used this to find the `ROUTE_MESSAGE` over-aggressive-drop bug.
- **Check the actual LLM response.** When something looked wrong, I'd `curl -X POST` the endpoint directly and inspect the JSON. That's how I found the `"bug | feature_request"` pipe-string-as-literal bug — the response body had the wrong `type` value, even though the prompt's spec was correct.
- **Push back when the answer felt off.** Example: when Claude said "we just made the LLM calls synchronous" I asked *"wait, I thought we were using AsyncOpenAI?"* — turned out the README explanation was wrong, not the code. Treating the assistant's claims as drafts to be questioned, not commitments, was important.

---

## Example 1 — code generation + cross-component coordination

I asked for a severity-score function and the model added it, wired it through the existing pipeline, ran a sanity test (`python3 -c "..."`), and produced an explicit "API delta" so I could update the frontend without re-reading the diff myself.

```
example 1: oaky now i want you to create a function to calculate the severity score and accordingly pass it to
   frontend with the apporpraiate labels we just discussed so that the frontend can directly show the
   label value

⏺ Now adding the severity score + label:

⏺ Update(app/models.py)
  ⎿  Added 1 line
       6  EventStatus = Literal["needs_reply", "active", "waiting_on_customer", "resolved"]
       7  Role = Literal["client", "engineer"]
       8  RiskLevel = Literal["low", "medium", "high"]
       9 +SeverityLabel = Literal["low", "medium", "high"]
      10
      11
      12  class Message(BaseModel):

⏺ Update(app/models.py)
  ⎿  Added 2 lines
      24      urgency: int  # 0-3, LLM
      25      consequence: int  # 0-3, LLM
      26      sentiment: int  # 0-3, LLM
      27 +    severity_score: int  # 0-15, sum
      28 +    severity_label: SeverityLabel  # bucketed
      29
      30
      31  class Event(BaseModel):

⏺ Add the severity calculation function and wire it in extract_features:

⏺ Update(app/pipeline.py)
  ⎿  Added 8 lines, removed 1 line
       4
       5  from . import prompts
       6  from .ai import call_llm
       7 -from .models import CustomerRisk, Event, EventStatus, Message, TicketFeatures
       7 +from .models import (
       8 +    CustomerRisk,
       9 +    Event,
      10 +    EventStatus,
      11 +    Message,
      12 +    SeverityLabel,
      13 +    TicketFeatures,
      14 +)
      15  from .store import store

❯ tell me what all changed endpoint reponse wise which i need to adapt my frontend for

⏺ Update(app/pipeline.py)
  ⎿  Added 20 lines
      67 +def calculate_severity(
      68 +    messages: int,
      69 +    people: int,
      70 +    urgency: int,
      71 +    consequence: int,
      72 +    sentiment: int,
      73 +) -> tuple[int, SeverityLabel]:
      74 +    score = messages + people + urgency + consequence + sentiment
      75 +    # escape hatch: catastrophic consequence alone forces high
      76 +    if consequence == 3:
      77 +        return score, "high"
      78 +    if score >= 8:
      79 +        label: SeverityLabel = "high"
      80 +    elif score >= 4:
      81 +        label = "medium"
      82 +    else:
      83 +        label = "low"
      84 +    return score, label

⏺ Bash(python3 -c "from app.main import app; from app.pipeline import calculate_severity; print('ok');
       print(calculate_severity(1, 1, 2, 2, 2))")
  ⎿  ok
     (8, 'high')

⏺ Backend complete. Now the API delta you need to adapt the frontend for:

  Event shape (/events, /messages/{id}, /pipeline/run events array) — added 3 fields:

  ┌───────────┬───────────────────────┬─────────────────────────────────────────────────────────┐
  │   Field   │         Type          │                          Notes                          │
  ├───────────┼───────────────────────┼─────────────────────────────────────────────────────────┤
  │ next_step │ string | null         │ per-ticket suggested next step (you already wired this) │
  ├───────────┼───────────────────────┼─────────────────────────────────────────────────────────┤
  │ features  │ TicketFeatures | null │ new — see below                                         │
  └───────────┴───────────────────────┴─────────────────────────────────────────────────────────┘

  TicketFeatures (new nested object on Event.features):

  type TicketFeatures = {
    messages: number;       // 0-3, deterministic bucket of message count
    people: number;         // 0-3, deterministic bucket of distinct senders
    urgency: number;        // 0-3, LLM
    consequence: number;    // 0-3, LLM
    sentiment: number;      // 0-3, LLM
    severity_score: number; // 0-15, sum
    severity_label: "low" | "medium" | "high";  // bucketed (with consequence=3 escape hatch → high)
  };

  CustomerRisk (/risks, /customers/{channel}/risk) — removed 1 field:

  ┌─────────────┬───────────────────────────────────────────────────┐
  │    Field    │                      Change                       │
  ├─────────────┼───────────────────────────────────────────────────┤
  │ next_action │ removed — moved to ticket-level (event.next_step) │
  └─────────────┴───────────────────────────────────────────────────┘

  So BackendCustomerRisk is now { channel, risk_level, explanation, most_relevant_signal } — drop
  next_action from your TS type.

  POST /pipeline/run — return shape unchanged but events now include features and next_step, and risks
   no longer include next_action.

  No new endpoints, no removed endpoints.

  Where to plug in on the frontend:

  1. lib/api.ts — BackendEvent already has features (just added). Drop next_action from
  BackendCustomerRisk.
  2. adaptEventToTicket — replace the hardcoded severity: "medium" with e.features?.severity_label ??
  "medium".
  3. components/ticket-detail.tsx — flip severityNotImpl = true to false (or remove the override
  entirely once features always populate).
  4. Optional: add a small "severity breakdown" panel showing the 5 raw scores. Useful for debugging
  the aggregation while you tune thresholds.
```

---

## Example 2 — research / quick clarification

I dropped a domain question mid-session and got a focused answer plus an honest "we don't have the inputs for this yet" note that shaped my next decision.

```
example 2: what does sla mean

⏺ SLA = Service Level Agreement. It's a contractual promise about response/resolution times.

  Example: "Enterprise plan customers get a 4-hour response SLA on bugs." If Acme is on Enterprise and
   sends a bug at 9am, you've contractually committed to reply by 1pm. Miss it → SLA breach →
  potentially credits owed, escalation, or contract leverage.

  In severity scoring, sla_pressure would be: how close to (or past) the SLA window are you? But to
  compute it, we need:
  1. The customer's contract tier
  2. The SLA terms for that tier
  3. The current age of the ticket

  We don't have (1) or (2) in the backend yet — that's why I'd stub it as 0 and revisit when customer
  metadata exists.
```

---

## Example 3 — multi-file refactor + adding new pipeline step

I asked Claude to switch from the synchronous OpenAI client to `AsyncOpenAI` and add the LLM-driven feature-extraction step at the same time. It coordinated changes across `ai.py`, `models.py`, `prompts.py`, `pipeline.py`, `main.py`, and `cli.py` — adding the prompt, refactoring the LLM caller, parallelising per-event enrichment with `asyncio.gather`, and updating the CLI/HTTP entrypoints to `await` the now-async functions in one pass.

```
example 3: okay so keep sentiment score also in range 0,1,2,3 so that its the same as other; im a bit bearish
  on the aggergation but we can refine it later after having some test; can you implemetn those
  features engineered from llm and return it for each ticket? also have we switched from openai to
  asyncopenai??

⏺ No, still using synchronous OpenAI — switching to AsyncOpenAI now so we can parallelize per-ticket
  feature extraction with asyncio.gather. Implementing both.

⏺ Update(app/ai.py)
  ⎿  Added 6 lines, removed 6 lines
       2  from pathlib import Path
       3
       4  from dotenv import load_dotenv
       5 -from openai import OpenAI
       5 +from openai import AsyncOpenAI
       6
       7  load_dotenv(Path(__file__).parent.parent / ".env")
       8
       9 -_client: OpenAI | None = None
       9 +_client: AsyncOpenAI | None = None
      10
      11
      12 -def _get_client() -> OpenAI:
      12 +def _get_client() -> AsyncOpenAI:
      13      global _client
      14      if _client is None:
      15          api_key = os.getenv("OPENAI_API_KEY")
      16          if not api_key:
      17              raise RuntimeError("OPENAI_API_KEY not set in environment")
      18 -        _client = OpenAI(api_key=api_key)
      18 +        _client = AsyncOpenAI(api_key=api_key)
      19      return _client
      20
      21
      22 -def call_llm(
      22 +async def call_llm(
      23      prompt: str,
      24      system: str | None = None,
      25      model: str = "gpt-4o-mini",
     ...
      34      if response_format:
      35          kwargs["response_format"] = response_format
      36
      37 -    response = _get_client().chat.completions.create(**kwargs)
      37 +    response = await _get_client().chat.completions.create(**kwargs)
      38      return response.choices[0].message.content or ""

⏺ Add TicketFeatures model:

⏺ Update(app/models.py)
  ⎿  Added 9 lines
      20 +class TicketFeatures(BaseModel):
      21 +    messages: int  # 0-3, deterministic
      22 +    people: int  # 0-3, deterministic
      23 +    urgency: int  # 0-3, LLM
      24 +    consequence: int  # 0-3, LLM
      25 +    sentiment: int  # 0-3, LLM

⏺ Add the feature-extraction prompt:

⏺ Update(app/prompts.py)
  ⎿  Added 32 lines
       1 +EXTRACT_TICKET_FEATURES = """You are a triage analyst for a forward-deployed engineer.
         + Score the following ticket on three feature dimensions, each on a 0-3 integer scale
         + with explicit anchors.
       2 +
       3 +URGENCY — how quickly should this be resolved?
       4 +  0 = no time pressure ("when you can", "no rush")
       5 +  1 = normal cadence (within a few days, no explicit deadline)
       6 +  2 = within a day (today/tomorrow language, end-of-day)
       7 +  3 = ASAP / blocking ("blocking us", "production down", "ASAP", "right now")
       8 +
       9 +CONSEQUENCE — if this ticket is ignored, how much damage results?
      10 +  0 = trivial (cosmetic, FYI, low-impact question, easy lookup)
      11 +  1 = mild inconvenience (single user affected, easy workaround exists)
      12 +  2 = team blocked / multiple users affected / partial outage / compliance gating a contract
      13 +  3 = production down / data loss / security breach / direct churn / contract-blocking
      ...
      24 +Return strict JSON in this shape:
      25 +{
      26 +  "urgency": 0 | 1 | 2 | 3,
      27 +  "consequence": 0 | 1 | 2 | 3,
      28 +  "sentiment": 0 | 1 | 2 | 3
      29 +}

⏺ Now refactor pipeline to async + add extract_features:

⏺ Write(app/pipeline.py)
  ⎿  Added 85 lines, removed 17 lines
       1 +import asyncio
      ...
      63 +async def assign_status(event: Event) -> tuple[EventStatus | None, str | None]:
      ...
      96 +async def extract_features(event: Event) -> TicketFeatures:
      ...
     169 +async def _enrich_event(event: Event) -> None:
     170 +    status_task = assign_status(event)
     171 +    features_task = extract_features(event)
     172 +    (status, next_step), features = await asyncio.gather(status_task, features_task)
     173 +    event.status = status
     174 +    event.next_step = next_step
     175 +    event.features = features
     ...
     180 +    channel_events = await asyncio.gather(
     181 +        *[extract_events_for_channel(c) for c in channels]
     182 +    )
     183 +    all_events = [e for sublist in channel_events for e in sublist]
     184 +    await asyncio.gather(*[_enrich_event(e) for e in all_events])

⏺ Update main.py to await the now-async pipeline functions:

⏺ Update(app/main.py)
  ⎿  Added 3 lines, removed 3 lines
      53  @app.post("/pipeline/run", response_model=PipelineRunResult)
      54 -def run_pipeline():
      54 +async def run_pipeline():
      55      store.events = []
      56      store.customer_risks = {}
      57 -    events = extract_events_for_all_channels()
      58 -    risks = synthesize_all_customers()
      57 +    events = await extract_events_for_all_channels()
      58 +    risks = await synthesize_all_customers()
      59      return PipelineRunResult(events=events, risks=risks)

⏺ Update CLI to use asyncio.run:

⏺ Update(app/cli.py)
  ⎿  Added 3 lines, removed 3 lines
      62 -def main() -> None:
      62 +async def main() -> None:
      ...
      71 -    extract_events_for_all_channels()
      71 +    await extract_events_for_all_channels()
      ...
      75  if __name__ == "__main__":
      76 -    main()
      76 +    asyncio.run(main())

⏺ Verify imports + run CLI to test the parallel async pipeline.
```

---

## Example 4 — design brainstorming with pushback

The most useful interaction. I described a feature-scoring scheme; Claude pushed back on two aspects of my design (telling me to compute deterministic features in code rather than asking the LLM, and laying out two ways to reconcile it with the existing customer-risk synthesis) and waited for me to confirm before writing any code.

```
example 4: okay so now we need to calculate a severity score for each ticket under a consumer; and then take
  the highest priority score for a ticket and assign in to the consumer (eg; consumer 1 has 3
  tickets; 1 low, 2 low and 3 medium; then consumer 1 has medium severity) do you understand? same
  way we need to calculate a risk score for each ticket; here are the features which we need get as
  outptu from the llm whicch we will then use to generate a severity_score. The factors are: 1)
  number of messages (eg was the same topic mentioned 3 times); then 2) number of people involved
  (eg; susan and barbara talked about this + looped in ben; so 3 people involoved). 3) the urgency
  (when should this be resolvbed) -> (asap, within 6 hours, within a day; etc.) and 4) consequence
  score (eg; if this was ignored; how much damage would it cause) do oyu understand me?

⏺ Yes, understood. Per-ticket severity from 4 features → max-rollup to customer. Two design
  refinements before we wire it:

  Refinement 1 — features 1 and 2 don't need the LLM.

  number_of_messages is len(event.message_ids) — already in the data. number_of_people is
  len(set(m.sender for m in event_messages where role=="client")). Computing these deterministically
  is free, exact, and repeatable. Asking the LLM for them adds cost, latency, and lets it disagree
  with the actual data.

  So: 2 deterministic features (counted in code) + 2 LLM features (urgency, consequence) = 1 LLM call
  per ticket.

  Refinement 2 — feature scaling and thresholds.

  Each feature on a 0–3 scale with explicit anchors so the LLM doesn't drift:

  ┌───────────────┬─────────────┬─────────────────┬──────────────────┬──────────────────────────┐
  │    Feature    │      0      │        1        │        2         │            3             │
  ├───────────────┼─────────────┼─────────────────┼──────────────────┼──────────────────────────┤
  │ messages      │ 1           │ 2-3             │ 4-6              │ 7+                       │
  ├───────────────┼─────────────┼─────────────────┼──────────────────┼──────────────────────────┤
  │ people        │ 1           │ 2               │ 3                │ 4+                       │
  ├───────────────┼─────────────┼─────────────────┼──────────────────┼──────────────────────────┤
  │ urgency (LLM) │ none        │ normal          │ within a day     │ ASAP / blocking          │
  ├───────────────┼─────────────┼─────────────────┼──────────────────┼──────────────────────────┤
  │ consequence   │ trivial if  │ mild            │ team blocked /   │ prod down / data loss /  │
  │ (LLM)         │ ignored     │ inconvenience   │ multi-user       │ churn / contract risk    │
  └───────────────┴─────────────┴─────────────────┴──────────────────┴──────────────────────────┘

  Aggregation:

  score = messages + people + urgency + consequence       # 0..12
  severity = "high"   if score >= 8
           | "medium" if score >= 4
           | "low"    otherwise

  Plus an escape hatch: if consequence == 3 alone (one prod-down ticket with one ping from one
  person), force high. Otherwise the sum-only logic misses critical low-volume incidents.

  Customer rollup:

  customer.severity = max(ticket.severity for ticket in tickets) using ordering low < medium < high.

  Question on the existing customer-risk synthesis:

  You currently have a separate per-customer LLM call (/risks → risk_level, explanation,
  most_relevant_signal). Two ways to reconcile:

  - Replace it — derive customer.risk_level from this severity rollup; keep the LLM call only for the
  explanation and most relevant signal text (drop risk_level from its output). Cheaper, internally
  consistent, but you lose the "exec advisor" reasoning that might catch things the 4 features miss
  (long-term churn, relationship trends).
  - Keep both — show ticket-level severity as the actionable triage signal; keep customer-level
  risk_level as the strategic read. They'll often agree; when they disagree, that's interesting (e.g.
  low individual severity but the customer is going quiet → that's a signal too).

  I'd lean toward replace for now — fewer concepts, easier to reason about. Can split later if the
  divergence proves valuable.

  Confirm the 4 features + aggregation, and tell me which way to go on the existing customer-risk
  synthesis. Then I wire it.
```
