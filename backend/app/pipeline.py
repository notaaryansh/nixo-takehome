import asyncio
import json
from datetime import datetime, timezone

from . import prompts
from .ai import call_llm
from .models import (
    CustomerRisk,
    Event,
    EventStatus,
    Message,
    RiskLevel,
    SeverityLabel,
    TicketFeatures,
)


_SEVERITY_RANK: dict[str, int] = {"low": 0, "medium": 1, "high": 2}
_RANK_TO_LEVEL: dict[int, RiskLevel] = {0: "low", 1: "medium", 2: "high"}


def rollup_risk_level(events: list[Event]) -> RiskLevel:
    # Only OPEN tickets contribute to customer risk. A customer with all
    # tickets resolved is, by definition, low risk regardless of the past
    # severity of those tickets.
    open_events = [e for e in events if e.status != "resolved"]
    severities = [
        e.features.severity_label for e in open_events if e.features is not None
    ]
    if not severities:
        return "low"
    max_rank = max(_SEVERITY_RANK[s] for s in severities)
    return _RANK_TO_LEVEL[max_rank]
from .store import store


def _parse_ts(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def _ago(ts: str, now: datetime) -> str:
    delta = now - _parse_ts(ts)
    secs = int(delta.total_seconds())
    if secs < 60:
        return f"{secs}s ago"
    mins = secs // 60
    if mins < 60:
        return f"{mins}m ago"
    hrs = mins // 60
    if hrs < 24:
        return f"{hrs}h ago"
    days = hrs // 24
    return f"{days}d ago"


def _dataset_now() -> datetime:
    if not store.messages:
        return datetime.now(timezone.utc)
    latest = max(store.messages, key=lambda m: m.timestamp)
    return _parse_ts(latest.timestamp)


# ---------- deterministic feature scoring ----------


def _bucket_messages(n: int) -> int:
    # Calibrated so 2 messages already shows persistence and 3+ is a clear pattern.
    if n <= 1:
        return 0
    if n == 2:
        return 1
    if n == 3:
        return 2
    return 3


def _bucket_people(n: int) -> int:
    # Going from 1 person to 2 is a big jump (someone else cared enough to chime in),
    # so we skip the mild middle and land 2 people at score 2.
    if n <= 1:
        return 0
    if n == 2:
        return 2
    return 3


def calculate_severity(
    messages: int,
    people: int,
    urgency: int,
    consequence: int,
    sentiment: int,
) -> tuple[int, SeverityLabel]:
    score = messages + people + urgency + consequence + sentiment
    # escape hatches: a single critical signal forces high, even if other axes are quiet.
    if consequence == 3 or sentiment == 3:
        return score, "high"
    if score >= 8:
        label: SeverityLabel = "high"
    elif score >= 4:
        label = "medium"
    else:
        label = "low"
    return score, label


# ---------- LLM calls ----------


async def assign_status(event: Event) -> tuple[EventStatus | None, str | None]:
    context = store.get_context(event.message_ids, window=5)
    if not context:
        return None, None

    relevant_set = set(event.message_ids)
    thread_lines = []
    for m in context:
        marker = "  <-- EVENT MESSAGE" if m.id in relevant_set else ""
        thread_lines.append(
            f"[{m.id} | {m.timestamp}] {m.sender}: {m.content}{marker}"
        )
    thread = "\n".join(thread_lines)

    prompt = (
        f"Event:\n"
        f"  id: {event.id}\n"
        f"  type: {event.type}\n"
        f"  heading: {event.heading}\n"
        f"  summary: {event.summary}\n"
        f"  message_ids (all client messages belonging to this event): "
        f"{', '.join(event.message_ids)}\n\n"
        f"Context (chronological — event messages are marked):\n{thread}"
    )
    raw = await call_llm(
        prompt=prompt,
        system=prompts.ASSIGN_STATUS,
        response_format={"type": "json_object"},
    )
    parsed = json.loads(raw)
    return parsed.get("status"), parsed.get("next_step")


async def extract_features(event: Event) -> TicketFeatures:
    event_msgs = [
        m for m in store.messages if m.id in event.message_ids and m.role == "client"
    ]
    msg_count = len(event_msgs)
    people_count = len({m.sender for m in event_msgs})

    thread = "\n".join(
        f"[{m.id} | {m.timestamp}] {m.sender}: {m.content}"
        for m in sorted(event_msgs, key=lambda m: m.timestamp)
    )
    prompt = (
        f"Ticket:\n"
        f"  type: {event.type}\n"
        f"  heading: {event.heading}\n"
        f"  summary: {event.summary}\n\n"
        f"Client messages on this ticket:\n{thread}"
    )
    raw = await call_llm(
        prompt=prompt,
        system=prompts.EXTRACT_TICKET_FEATURES,
        response_format={"type": "json_object"},
    )
    parsed = json.loads(raw)
    messages_score = _bucket_messages(msg_count)
    people_score = _bucket_people(people_count)
    urgency = int(parsed.get("urgency", 0))
    consequence = int(parsed.get("consequence", 0))
    sentiment = int(parsed.get("sentiment", 0))
    score, label = calculate_severity(
        messages_score, people_score, urgency, consequence, sentiment
    )
    return TicketFeatures(
        messages=messages_score,
        people=people_score,
        urgency=urgency,
        consequence=consequence,
        sentiment=sentiment,
        severity_score=score,
        severity_label=label,
    )


async def extract_events_for_channel(channel: str) -> list[Event]:
    messages = store.get_messages(channel=channel, role="client")
    if not messages:
        return []

    thread = "\n".join(
        f"[{m.id} | {m.timestamp}] {m.sender}: {m.content}" for m in messages
    )
    prompt = f"Channel: #{channel}\n\nClient messages:\n{thread}"

    raw = await call_llm(
        prompt=prompt,
        system=prompts.EXTRACT_EVENTS,
        response_format={"type": "json_object"},
    )
    parsed = json.loads(raw)

    events: list[Event] = []
    for e in parsed.get("events", []):
        message_ids = e.get("message_ids", [])
        sources = [m for m in (store.get_message(mid) for mid in message_ids) if m]
        if not sources:
            continue
        sources.sort(key=lambda m: m.timestamp)
        first = sources[0]
        event = Event(
            id=store.next_event_id(),
            heading=e["heading"],
            summary=e["summary"],
            type=e["type"],
            message_ids=[m.id for m in sources],
            sender=first.sender,
            channel=first.channel,
            timestamp=first.timestamp,
        )
        store.add_event(event)
        events.append(event)
    return events


async def _enrich_event(event: Event) -> None:
    status_task = assign_status(event)
    features_task = extract_features(event)
    (status, next_step), features = await asyncio.gather(status_task, features_task)
    event.status = status
    event.next_step = next_step
    event.features = features


async def extract_events_for_all_channels() -> list[Event]:
    channels = sorted({m.channel for m in store.get_messages()})
    channel_events = await asyncio.gather(
        *[extract_events_for_channel(c) for c in channels]
    )
    all_events = [e for sublist in channel_events for e in sublist]
    await asyncio.gather(*[_enrich_event(e) for e in all_events])
    return all_events


def _channel_display_name(channel: str) -> str:
    return " ".join(part.capitalize() for part in channel.replace("_", "-").split("-"))


def synthesize_customer(channel: str) -> CustomerRisk | None:
    events = store.get_events(channel)
    messages = store.get_messages(channel=channel)
    if not events and not messages:
        return None

    risk_level = rollup_risk_level(events)
    return CustomerRisk(channel=channel, risk_level=risk_level)


def synthesize_all_customers() -> list[CustomerRisk]:
    channels = sorted({m.channel for m in store.get_messages()})
    risks: list[CustomerRisk] = []
    for channel in channels:
        risk = synthesize_customer(channel)
        if risk is not None:
            store.set_customer_risk(channel, risk)
            risks.append(risk)
    return risks
