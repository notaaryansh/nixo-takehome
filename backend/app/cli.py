import asyncio
from collections import defaultdict

from .models import Event, Message
from .pipeline import extract_events_for_all_channels
from .store import store


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
    grouped = group_by_channel(store.get_messages(role="client"))
    for channel, msgs in grouped.items():
        print(f"\n=== #{channel} — client messages ({len(msgs)}) ===")
        for m in msgs:
            print(f"[{m.timestamp}] {m.sender}: {m.content}")


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
            print(f"\n  [{i}] {e.id}  ({e.type})  status={e.status}")
            print(f"      heading:     {e.heading}")
            print(f"      summary:     {e.summary}")
            print(f"      sender:      {e.sender}")
            print(f"      channel:     {e.channel}")
            print(f"      timestamp:   {e.timestamp}")
            print(f"      message_ids: {', '.join(e.message_ids)}")
            if e.next_step:
                print(f"      next_step:   {e.next_step}")
            if e.features:
                f = e.features
                total = f.messages + f.people + f.urgency + f.consequence + f.sentiment
                print(
                    f"      features:    msgs={f.messages} ppl={f.people} "
                    f"urg={f.urgency} cons={f.consequence} sent={f.sentiment} "
                    f"(sum={total}/15)"
                )


async def main() -> None:
    print_grouped_by_channel()
    print("\n" + "=" * 60)
    print("CLIENT MESSAGES ONLY (input to LLM)")
    print("=" * 60)
    print_client_messages_by_channel()
    print("\n" + "=" * 60)
    print("EXTRACTING EVENTS")
    print("=" * 60)
    await extract_events_for_all_channels()
    print_events()


if __name__ == "__main__":
    asyncio.run(main())
