import json
from pathlib import Path

from .models import CustomerRisk, Event, Message

DATA_PATH = Path(__file__).parent.parent / "data" / "raw_data.json"


class InMemoryStore:
    def __init__(self) -> None:
        self.messages: list[Message] = []
        self.events: list[Event] = []
        self.customer_risks: dict[str, CustomerRisk] = {}

    def load_messages_from_disk(self, path: Path = DATA_PATH) -> None:
        with path.open() as f:
            data = json.load(f)
        self.messages = [Message(**m) for m in data["messages"]]

    def get_messages(
        self,
        channel: str | None = None,
        sender: str | None = None,
        role: str | None = None,
    ) -> list[Message]:
        result = self.messages
        if channel is not None:
            result = [m for m in result if m.channel == channel]
        if sender is not None:
            result = [m for m in result if m.sender == sender]
        if role is not None:
            result = [m for m in result if m.role == role]
        return result

    def get_message(self, message_id: str) -> Message | None:
        return next((m for m in self.messages if m.id == message_id), None)

    def get_context(
        self, message_ids: list[str], window: int = 5
    ) -> list[Message]:
        sources = [m for m in (self.get_message(mid) for mid in message_ids) if m]
        if not sources:
            return []
        channel = sources[0].channel
        channel_msgs = sorted(
            (m for m in self.messages if m.channel == channel),
            key=lambda m: m.timestamp,
        )
        id_set = set(message_ids)
        source_indices = [i for i, m in enumerate(channel_msgs) if m.id in id_set]
        if not source_indices:
            return []
        start = max(0, min(source_indices) - window)
        end = min(len(channel_msgs), max(source_indices) + window + 1)
        return channel_msgs[start:end]

    def add_event(self, event: Event) -> None:
        self.events.append(event)

    def get_events(self, channel: str | None = None) -> list[Event]:
        if channel is None:
            return self.events
        return [e for e in self.events if e.channel == channel]

    def next_event_id(self) -> str:
        return f"evt_{len(self.events) + 1:03d}"

    def set_customer_risk(self, channel: str, risk: CustomerRisk) -> None:
        self.customer_risks[channel] = risk

    def get_customer_risk(self, channel: str) -> CustomerRisk | None:
        return self.customer_risks.get(channel)

    def get_all_customer_risks(self) -> list[CustomerRisk]:
        return list(self.customer_risks.values())


store = InMemoryStore()
store.load_messages_from_disk()
