# Backend

FastAPI service exposing raw message data for the dashboard and messaging UI.

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn main:app --reload --port 8000
```

## Endpoints

- `GET /health` — liveness check
- `GET /messages` — all messages; optional `?channel=acme-corp` filter
- `GET /messages/{id}` — single message by id
- `GET /channels` — list of distinct channels

## Data

Sample messages live in `raw_data.json`. Each message has the shape:

```json
{
  "id": "msg_001",
  "sender": "You" | "client",
  "content": "...",
  "channel": "acme-corp",
  "timestamp": "2026-05-01T09:12:43Z"
}
```
