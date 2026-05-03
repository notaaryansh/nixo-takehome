from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import Event, Message
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
