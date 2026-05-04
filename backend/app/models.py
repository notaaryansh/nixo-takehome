from typing import Literal

from pydantic import BaseModel

EventType = Literal["bug", "feature_request", "question"]
EventStatus = Literal["needs_reply", "active", "waiting_on_customer", "resolved"]
Role = Literal["client", "engineer"]
RiskLevel = Literal["low", "medium", "high"]
SeverityLabel = Literal["low", "medium", "high"]


class Message(BaseModel):
    id: str
    sender: str
    role: Role
    content: str
    channel: str
    timestamp: str


class TicketFeatures(BaseModel):
    messages: int  # 0-3, deterministic
    people: int  # 0-3, deterministic
    urgency: int  # 0-3, LLM
    consequence: int  # 0-3, LLM
    sentiment: int  # 0-3, LLM
    severity_score: int  # 0-15, sum
    severity_label: SeverityLabel  # bucketed


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
    next_step: str | None = None
    features: TicketFeatures | None = None


class MostRelevantSignal(BaseModel):
    quote: str
    author: str
    ago: str


class CustomerRisk(BaseModel):
    channel: str
    risk_level: RiskLevel
    explanation: str
    most_relevant_signal: MostRelevantSignal
