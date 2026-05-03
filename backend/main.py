import json
from collections import defaultdict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from ai_services import call_llm
from models import Event, Message
from store import store

app = FastAPI(title="Nixo Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/messages", response_model=list[Message])
def get_messages(channel: str | None = None):
    return store.get_messages(channel=channel)


@app.get("/channels", response_model=list[str])
def get_channels():
    return sorted({m.channel for m in store.get_messages()})


@app.get("/messages/{message_id}", response_model=Message)
def get_message(message_id: str):
    m = store.get_message(message_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Message not found")
    return m


@app.get("/events", response_model=list[Event])
def get_events(channel: str | None = None):
    return store.get_events(channel=channel)


def group_by_channel(messages: list[Message]) -> dict[str, list[Message]]:
    grouped: dict[str, list[Message]] = defaultdict(list)
    for m in messages:
        grouped[m.channel].append(m)
    return dict(grouped)


def print_grouped_by_channel() -> None:
    grouped = group_by_channel(store.get_messages())
    for channel, msgs in grouped.items():
        print(f"\n=== #{channel} ({len(msgs)} messages) ===")
        for m in msgs:
            print(f"[{m.timestamp}] {m.sender}: {m.content}")


def print_client_messages_by_channel() -> None:
    grouped = group_by_channel(store.get_messages(sender="client"))
    for channel, msgs in grouped.items():
        print(f"\n=== #{channel} — client messages ({len(msgs)}) ===")
        for m in msgs:
            print(f"[{m.timestamp}] {m.content}")


TICKET_SYSTEM_PROMPT = """You are an assistant that helps a forward-deployed engineer triage Slack channel conversations with enterprise clients.

You will be given only the CLIENT-side messages from a single channel (the engineer's replies are filtered out). Identify any distinct concerns raised by the client that warrant a tracked ticket. Casual chatter or acknowledgements should NOT become tickets.

Each ticket must reference exactly ONE source message id (the message that raised the concern). If a single message raises two distinct concerns, emit two tickets pointing to the same id.

Classify each ticket into one of three types:
- "bug" — something is broken, erroring, degraded, or behaving unexpectedly (covers incidents, outages, regressions, perf issues, wrong outputs)
- "feature_request" — the client wants a new capability or extension built
- "question" — the client is asking for information, clarification, or help (how-to, capability check, compliance/legal asks, contract/business asks)

Respond with strict JSON in this shape:
{
  "tickets": [
    {
      "id": "msg_xxx",
      "msg": "exact text of the source message",
      "type": "bug | feature_request | question"
    }
  ]
}

If there are no valid concerns, return {"tickets": []}."""


def extract_events_for_channel(channel: str) -> list[Event]:
    messages = store.get_messages(channel=channel, sender="client")
    if not messages:
        return []

    thread = "\n".join(
        f"[{m.id} | {m.timestamp}] {m.sender}: {m.content}" for m in messages
    )
    prompt = f"Channel: #{channel}\n\nClient messages:\n{thread}"

    raw = call_llm(
        prompt=prompt,
        system=TICKET_SYSTEM_PROMPT,
        response_format={"type": "json_object"},
    )
    parsed = json.loads(raw)

    events: list[Event] = []
    for t in parsed.get("tickets", []):
        source = store.get_message(t["id"])
        if source is None:
            continue
        events.append(
            Event(
                id=t["id"],
                msg=t["msg"],
                type=t["type"],
                sender=source.sender,
                channel=source.channel,
                timestamp=source.timestamp,
            )
        )
    return events


def extract_events_for_all_channels() -> list[Event]:
    channels = sorted({m.channel for m in store.get_messages()})
    all_events: list[Event] = []
    for channel in channels:
        events = extract_events_for_channel(channel)
        for e in events:
            store.add_event(e)
        all_events.extend(events)
    return all_events


def print_events() -> None:
    grouped: dict[str, list[Event]] = defaultdict(list)
    for e in store.get_events():
        grouped[e.channel].append(e)

    for channel, events in grouped.items():
        print(f"\n=== Events for #{channel} ===")
        if not events:
            print("(none)")
            continue
        for i, e in enumerate(events, 1):
            print(f"\n  [{i}] {e.id}  ({e.type})")
            print(f"      sender:    {e.sender}")
            print(f"      channel:   {e.channel}")
            print(f"      timestamp: {e.timestamp}")
            print(f"      msg:       {e.msg}")


if __name__ == "__main__":
    print_grouped_by_channel()
    print("\n" + "=" * 60)
    print("CLIENT MESSAGES ONLY (input to LLM)")
    print("=" * 60)
    print_client_messages_by_channel()
    print("\n" + "=" * 60)
    print("EXTRACTING EVENTS")
    print("=" * 60)
    extract_events_for_all_channels()
    print_events()
