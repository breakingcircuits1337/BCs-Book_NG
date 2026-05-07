#!/usr/bin/env bash
# Open Notebook launcher — starts the full stack and opens the app in a dedicated window.
# Works with Docker Compose (single-container mode by default).
# Usage: ./scripts/launch.sh [--compose-file docker-compose.single.yml]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="${1:-docker-compose.single.yml}"
APP_URL="http://localhost:8502"
WAIT_SECONDS=60

cd "$PROJECT_DIR"

# ── Start the stack ────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "ERROR: docker is not installed or not in PATH." >&2
  exit 1
fi

echo "[Open Notebook] Starting stack with $COMPOSE_FILE …"
docker compose -f "$COMPOSE_FILE" up -d

# ── Wait for the frontend to be ready ─────────────────────────────────────────
echo "[Open Notebook] Waiting for app to be ready at $APP_URL …"
for i in $(seq 1 "$WAIT_SECONDS"); do
  if curl -sf --max-time 2 "$APP_URL" > /dev/null 2>&1; then
    echo "[Open Notebook] Ready."
    break
  fi
  if [ "$i" -eq "$WAIT_SECONDS" ]; then
    echo "WARNING: App did not respond after ${WAIT_SECONDS}s — opening anyway." >&2
  fi
  sleep 1
done

# ── Open in a chromeless app window ───────────────────────────────────────────
# Tries Chromium-based browsers first (gives a native window with no browser UI),
# then falls back to whatever the system default is.
open_app() {
  local url="$1"
  for browser in \
      google-chrome \
      google-chrome-stable \
      chromium-browser \
      chromium \
      microsoft-edge \
      microsoft-edge-stable \
      brave-browser; do
    if command -v "$browser" &>/dev/null; then
      echo "[Open Notebook] Opening with $browser --app=$url"
      "$browser" --app="$url" --class=open-notebook &
      return 0
    fi
  done
  # Fallback: open in system default browser
  if command -v xdg-open &>/dev/null; then
    echo "[Open Notebook] Opening with xdg-open (no app-mode)"
    xdg-open "$url" &
  elif command -v sensible-browser &>/dev/null; then
    sensible-browser "$url" &
  else
    echo "Could not find a browser to open $url" >&2
    return 1
  fi
}

open_app "$APP_URL"
