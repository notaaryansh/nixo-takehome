#!/usr/bin/env bash
# Run both the FastAPI backend and Next.js frontend locally.
# Sets up venv + pip deps + npm deps if needed, then starts both servers.
# Ctrl+C stops both cleanly.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

# ---------- pretty printing ----------
color()  { printf "\033[%sm%s\033[0m\n" "$1" "$2"; }
info()   { color "1;34" "▸ $*"; }
warn()   { color "1;33" "! $*"; }
ok()     { color "1;32" "✓ $*"; }
banner() { color "1;36" "  $*"; }

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo
  info "Shutting down..."
  [[ -n "$BACKEND_PID"  ]] && kill "$BACKEND_PID"  2>/dev/null || true
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  ok "Stopped."
}
trap cleanup EXIT INT TERM

free_port() {
  local port=$1
  if lsof -ti:"$port" >/dev/null 2>&1; then
    warn "Port $port already in use — killing the existing process."
    lsof -ti:"$port" | xargs kill 2>/dev/null || true
    sleep 1
  fi
}

# ---------- backend setup ----------
info "Setting up backend..."
cd "$BACKEND_DIR"

if [[ ! -d .venv ]]; then
  info "Creating Python venv at $BACKEND_DIR/.venv ..."
  python3 -m venv .venv
fi

# shellcheck source=/dev/null
source .venv/bin/activate

info "Installing backend deps..."
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

if [[ ! -f .env ]]; then
  warn ".env not found at $BACKEND_DIR/.env"
  warn "LLM calls will fail until OPENAI_API_KEY is set."
  warn "  cp $BACKEND_DIR/.env.example $BACKEND_DIR/.env  # then add your key"
fi

# ---------- frontend setup ----------
info "Setting up frontend..."
cd "$FRONTEND_DIR"

if [[ ! -d node_modules ]]; then
  info "Installing frontend deps (this may take a minute)..."
  npm install
fi

# ---------- start servers ----------
free_port "$BACKEND_PORT"
free_port "$FRONTEND_PORT"

info "Starting backend on port $BACKEND_PORT ..."
cd "$BACKEND_DIR"
.venv/bin/uvicorn app.main:app --port "$BACKEND_PORT" --log-level warning &
BACKEND_PID=$!

info "Starting frontend on port $FRONTEND_PORT ..."
cd "$FRONTEND_DIR"
npm run dev -- --port "$FRONTEND_PORT" &
FRONTEND_PID=$!

# wait a moment for both to come up
sleep 3

echo
ok "App is running!"
echo
banner "Frontend:  http://localhost:$FRONTEND_PORT"
banner "Backend:   http://localhost:$BACKEND_PORT"
banner "API docs:  http://localhost:$BACKEND_PORT/docs"
echo
info "Press Ctrl+C to stop both servers."
echo

# block until either child exits or user hits Ctrl+C
wait
