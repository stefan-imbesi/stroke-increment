#!/usr/bin/env bash
# Install the Hammerspoon bindings into ~/.hammerspoon/.
# Idempotent: safe to re-run, and it appends to an existing init.lua rather
# than replacing it.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/integrations/hammerspoon/stroke-increment.lua"
HS_DIR="$HOME/.hammerspoon"
INIT="$HS_DIR/init.lua"
MARKER="-- >>> stroke-increment"

[ -f "$SRC" ] || { echo "Missing $SRC" >&2; exit 1; }

mkdir -p "$HS_DIR"
cp "$SRC" "$HS_DIR/stroke-increment.lua"
echo "Installed $HS_DIR/stroke-increment.lua"

if [ -f "$INIT" ] && grep -qF "$MARKER" "$INIT"; then
  echo "init.lua already loads it — left alone."
else
  [ -f "$INIT" ] && cp "$INIT" "$INIT.backup-$(date +%Y%m%d%H%M%S)" && echo "Backed up existing init.lua"
  cat >> "$INIT" <<'LUA'

-- >>> stroke-increment
-- Stroke weight hotkeys for Adobe Illustrator, active only while it is frontmost.
require("stroke-increment").start()
-- <<< stroke-increment
LUA
  echo "Wired into $INIT"
fi

echo
# Homebrew puts casks in /Applications, but that needs admin rights. On a
# managed Mac, --appdir=~/Applications installs without them.
if [ -d /Applications/Hammerspoon.app ] || [ -d "$HOME/Applications/Hammerspoon.app" ]; then
  echo "Next: reload the config from the Hammerspoon menu bar icon."
else
  echo "Hammerspoon is not installed yet:"
  echo "  brew install --cask hammerspoon"
  echo
  echo "If that fails on 'a password is required', your account is not an admin."
  echo "Install into your home folder instead, which needs no admin rights:"
  echo "  brew install --cask --appdir=\"\$HOME/Applications\" hammerspoon"
  echo
  echo "Then open it and grant Accessibility permission when prompted."
fi
