from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .models import CustomerRisk, Event, Message
from .pipeline import extract_events_for_all_channels, synthesize_all_customers
from .store import store

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


@app.get("/messages/{message_id}", response_model=Message)
def get_message(message_id: str):
    m = store.get_message(message_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Message not found")
    return m


@app.get("/channels", response_model=list[str])
def get_channels():
    return sorted({m.channel for m in store.get_messages()})


@app.get("/events", response_model=list[Event])
def get_events(channel: str | None = None):
    return store.get_events(channel=channel)


class PipelineRunResult(BaseModel):
    events: list[Event]
    risks: list[CustomerRisk]


@app.post("/pipeline/run", response_model=PipelineRunResult)
async def run_pipeline():
    store.events = []
    store.customer_risks = {}
    events = await extract_events_for_all_channels()
    risks = await synthesize_all_customers()
    return PipelineRunResult(events=events, risks=risks)


@app.get("/risks", response_model=list[CustomerRisk])
def get_risks():
    return store.get_all_customer_risks()


@app.get("/customers/{channel}/risk", response_model=CustomerRisk)
def get_customer_risk(channel: str):
    risk = store.get_customer_risk(channel)
    if risk is None:
        raise HTTPException(status_code=404, detail="Customer risk not synthesized")
    return risk
