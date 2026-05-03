import json

from . import prompts
from .ai import call_llm
from .models import Event, EventStatus
from .store import store


def assign_status(event: Event) -> EventStatus | None:
    context = store.get_context(event.message_ids, window=5)
    if not context:
        return None

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
    raw = call_llm(
        prompt=prompt,
        system=prompts.ASSIGN_STATUS,
        response_format={"type": "json_object"},
    )
    parsed = json.loads(raw)
    return parsed.get("status")


def extract_events_for_channel(channel: str) -> list[Event]:
    messages = store.get_messages(channel=channel, role="client")
    if not messages:
        return []

    thread = "\n".join(
        f"[{m.id} | {m.timestamp}] {m.sender}: {m.content}" for m in messages
    )
    prompt = f"Channel: #{channel}\n\nClient messages:\n{thread}"

    raw = call_llm(
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


def extract_events_for_all_channels() -> list[Event]:
    channels = sorted({m.channel for m in store.get_messages()})
    all_events: list[Event] = []
    for channel in channels:
        events = extract_events_for_channel(channel)
        for e in events:
            e.status = assign_status(e)
        all_events.extend(events)
    return all_events
