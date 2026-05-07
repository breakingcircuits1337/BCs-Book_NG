#!/usr/bin/env bash
# Launches Open Notebook natively (no Docker).
# Starts SurrealDB, the API, the background worker, and the Next.js frontend,
# then opens the app in a dedicated browser window.
#
# Prerequisites: run scripts/setup-native.sh once first.
#
# Usage:
#   bash scripts/launch-native.sh           # starts everything, opens browser
#   bash scripts/launch-native.sh --no-open # starts everything, no browser
#   bash scripts/launch-native.sh --stop    # stop all running native services

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

APP_URL="http://localhost:3000"
API_URL="http://localhost:5055"
SURREAL_PORT=8000
SURREAL_DATA="$PROJECT_DIR/data/surreal_data"
PID_DIR="$PROJECT_DIR/data/.pids"
LOG_DIR="$PROJECT_DIR/data/logs"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
info() { echo -e "${BLUE}→${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

# ── --stop flag ───────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--stop" ]]; then
  info "Stopping native Open Notebook services…"
  [ -f "$PID_DIR/frontend.pid" ] && kill "$(cat "$PID_DIR/frontend.pid")" 2>/dev/null && ok "Frontend stopped" || true
  [ -f "$PID_DIR/worker.pid"   ] && kill "$(cat "$PID_DIR/worker.pid")"   2>/dev/null && ok "Worker stopped"   || true
  [ -f "$PID_DIR/api.pid"      ] && kill "$(cat "$PID_DIR/api.pid")"      2>/dev/null && ok "API stopped"      || true
  [ -f "$PID_DIR/surreal.pid"  ] && kill "$(cat "$PID_DIR/surreal.pid")"  2>/dev/null && ok "SurrealDB stopped" || true
  rm -f "$PID_DIR"/*.pid
  echo "All services stopped."
  exit 0
fi

OPEN_BROWSER=true
[[ "${1:-}" == "--no-open" ]] && OPEN_BROWSER=false

cd "$PROJECT_DIR"

# ── Extend PATH for surreal installed by setup-native.sh ─────────────────────
export PATH="$HOME/.surrealdb/bin:$PATH"

VENV="$PROJECT_DIR/.venv"

# ── Pre-flight checks ─────────────────────────────────────────────────────────
info "Checking prerequisites…"

[ -f "$PROJECT_DIR/.env" ] || fail ".env not found. Run: bash scripts/setup-native.sh"
[ -d "$VENV" ]             || fail "venv not found at .venv. Run: bash scripts/setup-native.sh"
command -v surreal &>/dev/null || fail "SurrealDB not found. Run: bash scripts/setup-native.sh"
command -v node &>/dev/null   || fail "Node.js not found. Run: bash scripts/setup-native.sh"

# ── Activate the project venv ─────────────────────────────────────────────────
# shellcheck source=/dev/null
source "$VENV/bin/activate"
ok "venv active ($(python --version))"

# ── Load .env into the shell so all child processes inherit it ────────────────
set -a
# shellcheck source=/dev/null
source "$PROJECT_DIR/.env"
set +a

mkdir -p "$SURREAL_DATA" "$PID_DIR" "$LOG_DIR"

# ── Graceful shutdown on Ctrl-C or exit ───────────────────────────────────────
cleanup() {
  echo ""
  info "Shutting down…"
  [ -f "$PID_DIR/frontend.pid" ] && kill "$(cat "$PID_DIR/frontend.pid")" 2>/dev/null || true
  [ -f "$PID_DIR/worker.pid"   ] && kill "$(cat "$PID_DIR/worker.pid")"   2>/dev/null || true
  [ -f "$PID_DIR/api.pid"      ] && kill "$(cat "$PID_DIR/api.pid")"      2>/dev/null || true
  [ -f "$PID_DIR/surreal.pid"  ] && kill "$(cat "$PID_DIR/surreal.pid")"  2>/dev/null || true
  rm -f "$PID_DIR"/*.pid
  ok "All services stopped. Your data is saved."
}
trap cleanup EXIT INT TERM

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Open Notebook — Starting (native mode)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. SurrealDB ──────────────────────────────────────────────────────────────
# Check if already running on this port
if curl -sf --max-time 1 "http://localhost:$SURREAL_PORT/health" >/dev/null 2>&1; then
  ok "SurrealDB already running on port $SURREAL_PORT"
else
  info "Starting SurrealDB on port $SURREAL_PORT…"
  surreal start \
    --log warn \
    --bind "0.0.0.0:$SURREAL_PORT" \
    --user root \
    --pass root \
    "rocksdb:$SURREAL_DATA/mydatabase.db" \
    >"$LOG_DIR/surreal.log" 2>&1 &
  echo $! > "$PID_DIR/surreal.pid"

  # Wait up to 15s for SurrealDB
  for i in $(seq 1 15); do
    if curl -sf --max-time 1 "http://localhost:$SURREAL_PORT/health" >/dev/null 2>&1; then
      ok "SurrealDB ready"
      break
    fi
    [ "$i" -eq 15 ] && fail "SurrealDB did not start. Check $LOG_DIR/surreal.log"
    sleep 1
  done
fi

# ── 2. API (FastAPI) ──────────────────────────────────────────────────────────
if curl -sf --max-time 1 "$API_URL/health" >/dev/null 2>&1; then
  ok "API already running on port 5055"
else
  info "Starting API server on port 5055…"
  API_RELOAD=false python "$PROJECT_DIR/run_api.py" \
    >"$LOG_DIR/api.log" 2>&1 &
  echo $! > "$PID_DIR/api.pid"

  for i in $(seq 1 30); do
    if curl -sf --max-time 1 "$API_URL/health" >/dev/null 2>&1; then
      ok "API ready"
      break
    fi
    [ "$i" -eq 30 ] && fail "API did not start. Check $LOG_DIR/api.log"
    sleep 1
  done
fi

# ── 3. Background worker ──────────────────────────────────────────────────────
if pgrep -f "surreal-commands-worker" >/dev/null 2>&1; then
  ok "Worker already running"
else
  info "Starting background worker…"
  surreal-commands-worker --import-modules commands \
    >"$LOG_DIR/worker.log" 2>&1 &
  echo $! > "$PID_DIR/worker.pid"
  sleep 2
  ok "Worker started"
fi

# ── 4. Next.js frontend ───────────────────────────────────────────────────────
if curl -sf --max-time 1 "$APP_URL" >/dev/null 2>&1; then
  ok "Frontend already running on port 3000"
else
  info "Starting Next.js frontend on port 3000…"
  cd "$PROJECT_DIR/frontend"
  npm run dev >"$LOG_DIR/frontend.log" 2>&1 &
  echo $! > "$PID_DIR/frontend.pid"
  cd "$PROJECT_DIR"

  for i in $(seq 1 60); do
    if curl -sf --max-time 1 "$APP_URL" >/dev/null 2>&1; then
      ok "Frontend ready"
      break
    fi
    [ "$i" -eq 60 ] && { warn "Frontend took longer than expected. Check $LOG_DIR/frontend.log"; break; }
    sleep 1
  done
fi

# ── 5. Open in browser ────────────────────────────────────────────────────────
if $OPEN_BROWSER; then
  for browser in \
      google-chrome google-chrome-stable \
      chromium-browser chromium \
      microsoft-edge microsoft-edge-stable \
      brave-browser; do
    if command -v "$browser" &>/dev/null; then
      info "Opening $APP_URL with $browser --app…"
      "$browser" --app="$APP_URL" --class=open-notebook &
      break
    fi
  done

  # Fallback if no Chromium-based browser found
  if ! command -v google-chrome &>/dev/null && \
     ! command -v chromium-browser &>/dev/null && \
     ! command -v chromium &>/dev/null && \
     ! command -v microsoft-edge &>/dev/null && \
     ! command -v brave-browser &>/dev/null; then
    command -v xdg-open &>/dev/null && xdg-open "$APP_URL" & || true
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}Open Notebook is running${NC}"
echo "  Frontend : $APP_URL"
echo "  API      : $API_URL"
echo "  API docs : $API_URL/docs"
echo "  Logs     : $LOG_DIR/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Press Ctrl-C to stop all services."
echo "  Your data is stored in: $PROJECT_DIR/data/"
echo ""

# Keep running so trap fires on Ctrl-C
wait
