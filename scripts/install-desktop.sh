#!/usr/bin/env bash
# Installs Open Notebook as a Linux desktop application.
# After running, the app appears in your application launcher (GNOME, KDE, XFCE, etc.)
# and you can pin it to your taskbar/dock.
#
# Usage:
#   bash scripts/install-desktop.sh               # Docker mode (default)
#   bash scripts/install-desktop.sh --mode=docker # Docker mode (explicit)
#   bash scripts/install-desktop.sh --mode=native # Native mode (no Docker required)
#   bash scripts/install-desktop.sh --uninstall   # Remove the desktop entry

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

ICON_DIR="$HOME/.local/share/icons/hicolor/scalable/apps"
APPS_DIR="$HOME/.local/share/applications"
DESKTOP_FILE="$APPS_DIR/open-notebook.desktop"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
info() { echo -e "${BLUE}→${NC} $*"; }

# ── Parse arguments ────────────────────────────────────────────────────────────
MODE="docker"
for arg in "$@"; do
  case "$arg" in
    --mode=native) MODE="native" ;;
    --mode=docker) MODE="docker" ;;
    --uninstall)
      info "Uninstalling Open Notebook desktop entry…"
      rm -f "$DESKTOP_FILE" "$ICON_DIR/open-notebook.svg"
      command -v update-desktop-database &>/dev/null && \
        update-desktop-database "$APPS_DIR" 2>/dev/null || true
      ok "Uninstalled."
      exit 0
      ;;
  esac
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Open Notebook — Desktop Installer ($MODE mode)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Native mode: run setup first if needed ────────────────────────────────────
if [ "$MODE" = "native" ] && [ ! -f "$PROJECT_DIR/.env" ]; then
  warn "Native mode selected but setup has not been run."
  read -rp "Run setup now? [Y/n] " confirm
  confirm="${confirm:-Y}"
  if [[ "$confirm" =~ ^[Yy] ]]; then
    bash "$SCRIPT_DIR/setup-native.sh"
  else
    echo "Run 'bash scripts/setup-native.sh' first, then re-run this installer."
    exit 1
  fi
fi

# ── Choose launch script ───────────────────────────────────────────────────────
if [ "$MODE" = "native" ]; then
  LAUNCH_SCRIPT="$PROJECT_DIR/scripts/launch-native.sh"
  ENTRY_NAME="Open Notebook (native)"
else
  LAUNCH_SCRIPT="$PROJECT_DIR/scripts/launch.sh"
  ENTRY_NAME="Open Notebook"
fi

# ── Install icon ───────────────────────────────────────────────────────────────
info "Installing icon…"
mkdir -p "$ICON_DIR"
cp "$PROJECT_DIR/frontend/public/logo.svg" "$ICON_DIR/open-notebook.svg"
ok "Icon → $ICON_DIR/open-notebook.svg"

# ── Make launch scripts executable ────────────────────────────────────────────
chmod +x "$PROJECT_DIR/scripts/launch.sh"
chmod +x "$PROJECT_DIR/scripts/launch-native.sh"
chmod +x "$LAUNCH_SCRIPT"

# ── Write .desktop file ───────────────────────────────────────────────────────
info "Writing desktop entry…"
mkdir -p "$APPS_DIR"
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=$ENTRY_NAME
GenericName=AI Research Assistant
Comment=Privacy-focused AI research and knowledge management
Exec=$LAUNCH_SCRIPT
Icon=open-notebook
Terminal=false
StartupNotify=true
StartupWMClass=open-notebook
Categories=Office;Science;Education;
Keywords=AI;notebook;research;notes;podcast;
EOF
chmod +x "$DESKTOP_FILE"
ok "Desktop entry → $DESKTOP_FILE"

# ── Refresh desktop database ───────────────────────────────────────────────────
if command -v update-desktop-database &>/dev/null; then
  update-desktop-database "$APPS_DIR" 2>/dev/null || true
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}Installation complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Open Notebook now appears in your application launcher."
if [ "$MODE" = "native" ]; then
  echo "It will start SurrealDB, the API, the worker, and the"
  echo "frontend automatically — no Docker needed."
else
  echo "It will start the Docker Compose stack automatically."
fi
echo ""
echo "To uninstall:"
echo "  bash scripts/install-desktop.sh --uninstall"
echo ""
