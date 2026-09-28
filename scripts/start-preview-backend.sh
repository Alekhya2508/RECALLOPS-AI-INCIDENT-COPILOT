#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python}"
PYTHON_DEPS_DIR="${RECALLOPS_PYTHON_DEPS_DIR:-/tmp/recallops-deps}"
PIP_DIR="/tmp/recallops-pip"
BACKEND_LOG="/tmp/recallops-backend.log"

cd "$ROOT_DIR"

if ! "$PYTHON_BIN" -c "import fastapi, sqlalchemy, uvicorn" >/dev/null 2>&1 \
  && ! PYTHONPATH="$PYTHON_DEPS_DIR" "$PYTHON_BIN" -c "import fastapi, sqlalchemy, uvicorn" >/dev/null 2>&1; then
  echo "Preparing RecallOps preview backend dependencies..."
  if ! "$PYTHON_BIN" -m pip --version >/dev/null 2>&1; then
    rm -rf "$PIP_DIR"
    curl -fsSL https://bootstrap.pypa.io/get-pip.py -o /tmp/recallops-get-pip.py
    env -i PATH="$PATH" HOME=/tmp PYTHONNOUSERSITE=1 \
      "$PYTHON_BIN" /tmp/recallops-get-pip.py --target "$PIP_DIR"
  fi
  rm -rf "$PYTHON_DEPS_DIR"
  if "$PYTHON_BIN" -m pip --version >/dev/null 2>&1; then
    "$PYTHON_BIN" -m pip install --target "$PYTHON_DEPS_DIR" --no-cache-dir -r backend/requirements.txt
  else
    env -i PATH="$PATH" HOME=/tmp PYTHONNOUSERSITE=1 PYTHONPATH="$PIP_DIR" \
      "$PYTHON_BIN" -m pip install --target "$PYTHON_DEPS_DIR" --no-cache-dir -r backend/requirements.txt
  fi
fi

export PYTHONPATH="$PYTHON_DEPS_DIR:$ROOT_DIR${PYTHONPATH:+:$PYTHONPATH}"
export DATABASE_URL="${DATABASE_URL:-sqlite:///$ROOT_DIR/recallops.db}"
export RECALLOPS_DEMO_MODE="${RECALLOPS_DEMO_MODE:-true}"

"$PYTHON_BIN" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

cleanup() {
  kill "$BACKEND_PID" >/dev/null 2>&1 || true
  wait "$BACKEND_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

HEALTHY=false
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8000/api/health >/dev/null 2>&1; then
    HEALTHY=true
    break
  fi
  if ! kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    echo "RecallOps preview backend failed to start." >&2
    cat "$BACKEND_LOG" >&2
    exit 1
  fi
  sleep 0.25
done

if [ "$HEALTHY" != "true" ]; then
  echo "RecallOps preview backend did not become healthy in time." >&2
  cat "$BACKEND_LOG" >&2
  exit 1
fi

echo "RecallOps preview backend is ready on http://127.0.0.1:8000"
wait "$BACKEND_PID"
