from typing import Literal

from pydantic import BaseModel

EventType = Literal["bug", "feature_request", "question"]


class Message(BaseModel):
    id: str
    sender: str
    content: str
    channel: str
    timestamp: str


class Event(BaseModel):
    id: str
    msg: str
    type: EventType
    sender: str
    channel: str
    timestamp: str
