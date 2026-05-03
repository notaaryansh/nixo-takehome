import json
from pathlib import Path

from models import Event, Message

DATA_PATH = Path(__file__).parent / "raw_data.json"


class InMemoryStore:
    def __init__(self) -> None:
        self.messages: list[Message] = []
        self.events: list[Event] = []

    def load_messages_from_disk(self, path: Path = DATA_PATH) -> None:
        with path.open() as f:
            data = json.load(f)
        self.messages = [Message(**m) for m in data["messages"]]

    def get_messages(
        self, channel: str | None = None, sender: str | None = None
    ) -> list[Message]:
        result = self.messages
        if channel is not None:
            result = [m for m in result if m.channel == channel]
        if sender is not None:
            result = [m for m in result if m.sender == sender]
        return result

    def get_message(self, message_id: str) -> Message | None:
        return next((m for m in self.messages if m.id == message_id), None)

    def add_event(self, event: Event) -> None:
        self.events.append(event)

    def get_events(self, channel: str | None = None) -> list[Event]:
        if channel is None:
            return self.events
        return [e for e in self.events if e.channel == channel]


store = InMemoryStore()
store.load_messages_from_disk()
