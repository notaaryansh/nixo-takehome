import json
from collections import defaultdict
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Nixo Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = Path(__file__).parent / "raw_data.json"


class Message(BaseModel):
    id: str
    sender: str
    content: str
    channel: str
    timestamp: str


def load_messages() -> list[Message]:
    with DATA_PATH.open() as f:
        data = json.load(f)
    return [Message(**m) for m in data["messages"]]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/messages", response_model=list[Message])
def get_messages(channel: str | None = None):
    messages = load_messages()
    if channel:
        messages = [m for m in messages if m.channel == channel]
    return messages


@app.get("/channels", response_model=list[str])
def get_channels():
    messages = load_messages()
    return sorted({m.channel for m in messages})


@app.get("/messages/{message_id}", response_model=Message)
def get_message(message_id: str):
    for m in load_messages():
        if m.id == message_id:
            return m
    raise HTTPException(status_code=404, detail="Message not found")


def group_by_channel(messages: list[Message]) -> dict[str, list[Message]]:
    grouped: dict[str, list[Message]] = defaultdict(list)
    for m in messages:
        grouped[m.channel].append(m)
    return dict(grouped)


def print_grouped_by_channel() -> None:
    grouped = group_by_channel(load_messages())
    for channel, msgs in grouped.items():
        print(f"\n=== #{channel} ({len(msgs)} messages) ===")
        for m in msgs:
            print(f"[{m.timestamp}] {m.sender}: {m.content}")


if __name__ == "__main__":
    print_grouped_by_channel()
