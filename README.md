# RecallOps

AI Incident Response Copilot with persistent operational memory.

## Problem

Production incidents repeat, while useful operational knowledge is buried across incident reports, postmortems, logs, runbooks, and engineer experience.

## Solution

RecallOps gives the incident-response team persistent operational memory. It retains confirmed root causes, resolutions, outcomes, lessons, and engineer feedback, then recalls relevant experience during future investigations.

## Core Loop

```text
Incident → Recall → AI → Resolve → Retain → Reflect
             ↑                              │
             └──── better future response ──┘
```

## Key Differentiator

**Persistent operational memory.**

A normal assistant answers the current question. RecallOps remembers how previous incidents were solved and uses that experience as context without treating historical similarity as proof.

## Architecture

```text
React + TypeScript + Vite
             ↓ /api
          FastAPI
             ↓
   PostgreSQL / SQLite
             ↓
          Hindsight
             ↓
 Groq/OpenAI-compatible LLM
```

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide, Recharts, Framer Motion
- **Backend:** Python, FastAPI, Pydantic, SQLAlchemy
- **Database:** PostgreSQL in production; SQLite for the configuration-free demo
- **Memory:** Hindsight adapter with durable database fallback
- **AI:** Groq/OpenAI-compatible structured inference with deterministic fallback

Secrets are used only by FastAPI. The browser communicates through typed `/api` requests.

## Demo: INC-001 → INC-017

1. Open RecallOps and select **Launch Demo**.
2. Inspect retained `INC-001`, a resolved Payment API database-timeout incident.
3. Open active `INC-017`.
4. Select **Run AI investigation**.
5. RecallOps reads current evidence, searches operational memory, and recalls `INC-001` at `91%` similarity.
6. Review why it matched, previous root cause, previous resolution, current evidence, historical evidence, recommendations, and uncertainty.
7. Resolve `INC-017` and select **Retain to memory**.
8. Open Learning and inspect the recurring six-incident Payment API pattern.

**Reset Demo Data** safely restores only the known RecallOps demo incident keys. The reset is idempotent, preserves unrelated records, and is disabled when `RECALLOPS_DEMO_MODE=false`.

The demo requires no Kubernetes cluster, monitoring infrastructure, production credentials, or manual database changes.

## Setup

Requirements:

- Node.js and pnpm versions from `.mise.toml`
- Python 3.11+
- Docker only for local PostgreSQL

Install dependencies:

```bash
pnpm install
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements-dev.txt
cp .env.example .env
```

Run FastAPI:

```bash
pnpm backend:dev
```

Run the frontend when it is not already managed by Figma Make:

```bash
pnpm dev
```

Vite proxies `/api` to `http://127.0.0.1:8000` by default. FastAPI documentation is available at `/docs`.

### PostgreSQL with Docker

```bash
docker compose up -d postgres
export DATABASE_URL=postgresql+psycopg://recallops:recallops@localhost:5432/recallops
pnpm backend:dev
```

For a local zero-configuration demo:

```bash
export DATABASE_URL=sqlite:///./recallops.db
```

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLAlchemy PostgreSQL or SQLite connection |
| `RECALLOPS_DEMO_MODE` | Enables deterministic seed and protected reset |
| `FRONTEND_ORIGINS` | Comma-separated CORS allowlist |
| `HINDSIGHT_MODE` | `local` or `remote` |
| `HINDSIGHT_BASE_URL` | Hindsight service URL |
| `HINDSIGHT_API_KEY` | Optional backend-only Hindsight token |
| `HINDSIGHT_BANK_ID` | Hindsight incident-memory bank |
| `HINDSIGHT_ALLOW_DB_FALLBACK` | Enables durable memory fallback |
| `GROQ_API_KEY` | Backend-only Groq API key |
| `GROQ_BASE_URL` | OpenAI-compatible inference base URL |
| `GROQ_MODEL` | Inference model identifier |
| `VITE_API_URL` | Browser-visible API path, normally `/api` |
| `RECALLOPS_API_URL` | Vite development proxy target |

`.env` is ignored by Git. `.env.example` contains placeholders only.

## Fallback Behavior

- **Hindsight unavailable:** investigation continues with retained database memory and a degraded status.
- **LLM unavailable:** a typed deterministic investigation provides evidence, paths, recommendations, confidence, and uncertainty.
- **No relevant memory:** RecallOps explicitly reports no match and uses current evidence only.
- **Database unavailable:** health and API responses provide human-readable failure messages.
- **API unavailable:** the frontend provides retry actions without displaying stack traces.

## Testing

```bash
pnpm backend:test
pnpm build
python -m compileall -q backend/app
```

Verified coverage includes:

- Incident creation and retrieval
- Canonical, multiple, and no-match recall
- Structured analysis and provider fallback
- Resolution, feedback, and idempotent retention
- Learning/reflection
- Safe, repeatable demo reset
- Preservation of unrelated data
- Invalid input and provider outage handling

## Deployment

1. Build the frontend with `pnpm build`.
2. Deploy `dist/` to a static host or CDN.
3. Deploy `backend.app.main:app` behind HTTPS.
4. Configure managed PostgreSQL and exact `FRONTEND_ORIGINS`.
5. Store Hindsight and LLM credentials only in the backend environment.
6. Set `RECALLOPS_DEMO_MODE=false` outside demo environments.
7. Route frontend `/api` traffic to FastAPI.

RecallOps recommends investigation actions only. It does not restart services, deploy code, change production configuration, or modify Kubernetes.

## Limitations

- **PostgreSQL live verification unavailable.** PostgreSQL configuration and schema compatibility are present; the verified demo used SQLite.
- **Remote Hindsight live verification unavailable.** The adapter is implemented; durable database fallback was verified.
- **Live Groq/OpenAI-compatible inference unavailable.** Structured deterministic fallback was verified.
- **Deterministic fallback verified.**
