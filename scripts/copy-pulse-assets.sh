#!/usr/bin/env bash
#
# Copy Pulse script assets (pulse.sh, pulse.ps1, prompts, SETUP.md)
# from the source tree (extensions/stelow/pulse/) into the build
# output (build/extensions/stelow/pulse/) so the bundled scripts
# are available at runtime via import.meta.dirname.
#
# These are non-TS files that tsc doesn't process, so we copy them
# manually as part of the build.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
SRC="$PACKAGE_DIR/extensions/stelow/pulse"
DST="$PACKAGE_DIR/build/extensions/stelow/pulse"

if [[ ! -d "$SRC" ]]; then
  echo "copy-pulse-assets: source not found at $SRC (skipping)"
  exit 0
fi

mkdir -p "$DST"
for f in "$SRC"/*; do
  if [[ -f "$f" ]]; then
    cp "$f" "$DST/"
  fi
done
echo "copy-pulse-assets: copied $(ls "$SRC" | wc -l | tr -d ' ') files to build/extensions/stelow/pulse/"
