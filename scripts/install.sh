#!/usr/bin/env bash
# Copy the built scripts into every Illustrator install's Scripts folder.
# Illustrator only scans that folder at launch, so restart it afterwards.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist"

[ -d "$DIST" ] && [ -n "$(ls -A "$DIST" 2>/dev/null)" ] || "$ROOT/scripts/build.sh"

# The folder is 'Presets' on some installs and 'Presets.localized' on others,
# with a locale folder beneath it. Match both.
targets=()
while IFS= read -r -d '' dir; do
  targets+=("$dir")
done < <(find /Applications -maxdepth 4 -type d -path '*Adobe Illustrator*/Presets*/*/Scripts' -print0 2>/dev/null)

if [ ${#targets[@]} -eq 0 ]; then
  echo "No Illustrator Scripts folder found under /Applications." >&2
  echo "Copy dist/*.jsx into <Illustrator>/Presets*/<locale>/Scripts/ by hand." >&2
  exit 1
fi

# That folder lives inside the app bundle and is root-owned, so this usually
# needs sudo. Ask once, up front, rather than per file.
SUDO=""
for target in "${targets[@]}"; do
  if [ ! -w "$target" ]; then
    echo "Illustrator's Scripts folder needs admin rights."
    sudo -v
    SUDO="sudo"
    break
  fi
done

for target in "${targets[@]}"; do
  echo "Installing into: $target"
  for script in "$DIST"/*.jsx; do
    $SUDO cp "$script" "$target/"
    echo "  $(basename "$script")"
  done
done

echo
echo "Done. Restart Illustrator, then look under File > Scripts."
echo "To bind keys, see docs/INSTALL.md."
