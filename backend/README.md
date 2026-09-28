# RecallOps API

FastAPI backend for incident persistence, operational memory, AI investigation, resolution, and learning.

## Local demo

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements-dev.txt
cp .env.example .env
python -m uvicorn backend.app.main:app --reload --port 8000
```

The default `DATABASE_URL` uses SQLite so the hackathon demo runs without external infrastructure. The schema and ORM are PostgreSQL-compatible. To use PostgreSQL:

```bash
docker compose up -d postgres
export DATABASE_URL=postgresql+psycopg://recallops:recallops@localhost:5432/recallops
```

The Vite server proxies `/api` to `http://127.0.0.1:8000`. Override this with `RECALLOPS_API_URL` for local proxying or `VITE_API_URL` for a deployed API.

## Hindsight

Set `HINDSIGHT_MODE=remote`, `HINDSIGHT_BASE_URL`, `HINDSIGHT_BANK_ID`, and optionally `HINDSIGHT_API_KEY`. RecallOps calls Hindsight's bank memory retain and recall endpoints. `HINDSIGHT_ALLOW_DB_FALLBACK=true` keeps investigation available and labels the response degraded when Hindsight cannot be reached.

The default `local` mode uses the same retain/recall semantics against durable database records. It is deterministic and makes the complete demo repeatable.

## Groq

Set `GROQ_API_KEY` and optionally `GROQ_MODEL`. The API sends current incident evidence and recalled memories to the OpenAI-compatible Groq endpoint. Responses must match the structured analysis schema and include uncertainty language. Without a key, RecallOps returns a safe deterministic investigation and labels it as a fallback.

## Tests

```bash
python -m pytest backend/tests -q
```

Tests use a temporary SQLite database and never require live PostgreSQL, Hindsight, or Groq services.
