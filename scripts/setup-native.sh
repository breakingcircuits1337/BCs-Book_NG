#!/usr/bin/env bash
# One-time setup for running BCs BookNG without Docker.
# Safe to re-run — it skips steps that are already complete.
#
# What it installs/configures:
#   • uv          (Python package manager, installs to ~/.local/bin)
#   • SurrealDB   (database binary, installs to ~/.surrealdb/bin)
#   • Python deps via `uv sync`
#   • Node deps via `npm install` in frontend/
#   • .env file with correct local-mode defaults

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
info() { echo -e "${BLUE}→${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  BCs BookNG — Native Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Check minimum requirements ─────────────────────────────────────────────
info "Checking requirements…"

if ! command -v curl &>/dev/null; then
  fail "curl is required but not installed. Install it with: sudo apt install curl"
fi

if ! command -v node &>/dev/null; then
  fail "Node.js 18+ is required. Install it from https://nodejs.org or via nvm."
fi

NODE_VER=$(node -e "process.exit(parseInt(process.version.slice(1)) < 18 ? 1 : 0)" 2>/dev/null && echo ok || echo fail)
if [ "$NODE_VER" = "fail" ]; then
  fail "Node.js 18 or newer is required. Found: $(node --version)"
fi
ok "Node.js $(node --version)"

if ! command -v npm &>/dev/null; then
  fail "npm is required but not found. It should come with Node.js."
fi
ok "npm $(npm --version)"

# ── 2. Install uv ─────────────────────────────────────────────────────────────
if command -v uv &>/dev/null; then
  ok "uv $(uv --version | head -1)"
else
  info "Installing uv (Python package manager)…"
  curl -LsSf https://astral.sh/uv/install.sh | sh
  # Add to current session
  export PATH="$HOME/.local/bin:$PATH"
  if command -v uv &>/dev/null; then
    ok "uv installed"
  else
    fail "uv installation failed. Add ~/.local/bin to your PATH and retry."
  fi
fi

# ── 3. Install SurrealDB ───────────────────────────────────────────────────────
if command -v surreal &>/dev/null; then
  ok "SurrealDB $(surreal version 2>/dev/null | head -1 || echo '(version unknown)')"
else
  info "Installing SurrealDB…"
  curl -sSf https://install.surrealdb.com | sh
  # The installer puts the binary in ~/.surrealdb/bin
  export PATH="$HOME/.surrealdb/bin:$PATH"
  if command -v surreal &>/dev/null; then
    ok "SurrealDB installed"
    warn "Add ~/.surrealdb/bin to your PATH to use 'surreal' from any terminal:"
    warn "  echo 'export PATH=\"\$HOME/.surrealdb/bin:\$PATH\"' >> ~/.bashrc"
  else
    fail "SurrealDB installation failed. Visit https://surrealdb.com/install"
  fi
fi

# ── 4. Python virtual environment + dependencies ──────────────────────────────
VENV="$PROJECT_DIR/.venv"
if [ -d "$VENV" ]; then
  ok "venv already exists at .venv"
else
  info "Creating Python virtual environment at .venv…"
  uv venv "$VENV"
  ok "venv created"
fi

info "Installing Python dependencies into .venv…"
uv sync
ok "Python dependencies installed into $VENV"

# ── 5. Node.js dependencies ───────────────────────────────────────────────────
info "Installing Node.js dependencies…"
cd "$PROJECT_DIR/frontend"
npm install --legacy-peer-deps
cd "$PROJECT_DIR"
ok "Node.js dependencies installed"

# ── 6. Create data directories ────────────────────────────────────────────────
info "Creating data directories…"
mkdir -p "$PROJECT_DIR/data/surreal_data"
mkdir -p "$PROJECT_DIR/data/sqlite-db"
mkdir -p "$PROJECT_DIR/data/uploads"
ok "Data directories ready"

# ── 7. Set up .env file ───────────────────────────────────────────────────────
ENV_FILE="$PROJECT_DIR/.env"
if [ -f "$ENV_FILE" ]; then
  warn ".env already exists — skipping. Review $ENV_FILE to confirm local settings."
else
  info "Creating .env from template…"
  # Copy the example and patch the SurrealDB URL for local (non-Docker) mode
  sed 's|SURREAL_URL="ws://surrealdb/rpc:8000"|SURREAL_URL="ws://localhost:8000/rpc"|g' \
    "$PROJECT_DIR/.env.example" > "$ENV_FILE"
  ok ".env created at $ENV_FILE"
  echo ""
  echo -e "  ${YELLOW}ACTION REQUIRED:${NC} Open .env and add at least one AI provider key."
  echo "  Example:"
  echo "    OPENAI_API_KEY=sk-..."
  echo "    # or"
  echo "    ANTHROPIC_API_KEY=sk-ant-..."
  echo "    # or any other supported provider"
fi

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}Setup complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Add an AI provider key to .env (if you haven't already)"
echo "  2. Launch the app:"
echo "       bash scripts/launch-native.sh"
echo ""
echo "Or install as a desktop app (adds to your application launcher):"
echo "       bash scripts/install-desktop.sh --mode=native"
echo ""
