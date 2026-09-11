#!/usr/bin/env bash
# Inline the shared engine into each command so every file in dist/ is a
# standalone .jsx. Illustrator resolves //@include relative to the script's
# own folder, which is fragile once users start moving files around.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/src"
DIST="$ROOT/dist"
ENGINE="$SRC/lib/StrokeIncrement.jsxinc"

[ -f "$ENGINE" ] || { echo "Missing engine: $ENGINE" >&2; exit 1; }

rm -rf "$DIST"
mkdir -p "$DIST"

count=0
for command in "$SRC"/commands/*.jsx; do
  name="$(basename "$command")"
  out="$DIST/$name"

  awk -v engine="$ENGINE" '
    /^\/\/@include/ {
      while ((getline line < engine) > 0) print line
      close(engine)
      next
    }
    { print }
  ' "$command" > "$out"

  count=$((count + 1))
  echo "  built  $name"
done

echo "Built $count standalone script(s) into dist/"
