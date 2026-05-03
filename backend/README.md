# Backend

FastAPI service + LLM pipeline that turns Slack-style channel messages into tracked events.

## Layout

```
backend/
  .env, .env.example
  data/
    raw_data.json       # sample messages
  app/
    main.py             # FastAPI app + routes
    cli.py              # terminal demo runner
    models.py           # Pydantic schemas
    store.py            # in-memory store
    ai.py               # OpenAI client wrapper
    pipeline.py         # extract_events, assign_status
    prompts.py          # system prompts
  requirements.txt
```

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # then add your OPENAI_API_KEY
```

## Run

API server:

```bash
uvicorn app.main:app --reload --port 8000
```

Terminal demo (loads messages, prints groupings, runs the LLM pipeline, prints events):

```bash
python -m app.cli
```

## Endpoints

- `GET /health`
- `GET /messages` — all messages; optional `?channel=` filter
- `GET /messages/{id}`
- `GET /channels`
- `GET /events` — extracted events; optional `?channel=` filter

## Models

- **Message** — `{id, sender, role, content, channel, timestamp}`
- **Event** — `{id, heading, summary, type, message_ids[], sender, channel, timestamp, status}`
  - `type`: `bug | feature_request | question`
  - `status`: `needs_reply | active | waiting_on_customer | resolved`
