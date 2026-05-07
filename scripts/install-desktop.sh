#!/usr/bin/env bash
# Installs Open Notebook as a Linux desktop application.
# After running, the app will appear in your application launcher and
# you can pin it to your taskbar/dock.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

ICON_DIR="$HOME/.local/share/icons/hicolor/scalable/apps"
APPS_DIR="$HOME/.local/share/applications"
DESKTOP_FILE="$APPS_DIR/open-notebook.desktop"

# ── Install icon ───────────────────────────────────────────────────────────────
mkdir -p "$ICON_DIR"
cp "$PROJECT_DIR/frontend/public/logo.svg" "$ICON_DIR/open-notebook.svg"
echo "✓ Icon installed to $ICON_DIR/open-notebook.svg"

# ── Make launch script executable ─────────────────────────────────────────────
chmod +x "$PROJECT_DIR/scripts/launch.sh"

# ── Install .desktop file with real path ──────────────────────────────────────
mkdir -p "$APPS_DIR"
sed "s|INSTALL_PATH|$PROJECT_DIR|g" "$PROJECT_DIR/open-notebook.desktop" > "$DESKTOP_FILE"
chmod +x "$DESKTOP_FILE"
echo "✓ Desktop entry installed to $DESKTOP_FILE"

# ── Refresh desktop database ───────────────────────────────────────────────────
if command -v update-desktop-database &>/dev/null; then
  update-desktop-database "$APPS_DIR" 2>/dev/null || true
fi

echo ""
echo "Open Notebook is now installed as a desktop application."
echo "You can launch it from your application menu or by running:"
echo "  $PROJECT_DIR/scripts/launch.sh"
echo ""
echo "To uninstall, run:"
echo "  rm '$DESKTOP_FILE' '$ICON_DIR/open-notebook.svg'"
