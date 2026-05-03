from typing import Literal

from pydantic import BaseModel

EventType = Literal["bug", "feature_request", "question"]
EventStatus = Literal["needs_reply", "active", "waiting_on_customer", "resolved"]
Role = Literal["client", "engineer"]


class Message(BaseModel):
    id: str
    sender: str
    role: Role
    content: str
    channel: str
    timestamp: str


class Event(BaseModel):
    id: str
    heading: str
    summary: str
    type: EventType
    message_ids: list[str]
    sender: str
    channel: str
    timestamp: str
    status: EventStatus | None = None
