#!/usr/bin/env bash
# Idempotent launcher for the stelow board.
# Pattern: OPEN if no pane exists, FOCUS if exists but not focused, CLOSE if already focused.
# Reference: herdr-file-viewer/scripts/open-file-viewer.sh
set -uo pipefail

herdr_bin="${HERDR_BIN_PATH:-herdr}"

panes_json="$("$herdr_bin" pane list 2>/dev/null || true)"

# Extract focused_pane_id from the JSON.
focused_id=$(printf '%s' "$panes_json" \
  | python3 -c '
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get("focused_pane_id", ""))
except Exception:
    pass
' 2>/dev/null || true)

# Extract pane id of pane with label "Workflow".
board_id=$(printf '%s' "$panes_json" \
  | python3 -c '
import sys, json
try:
    data = json.load(sys.stdin)
    for p in data.get("panes", []):
        if p.get("label") == "Workflow":
            print(p["pane_id"])
            break
except Exception:
    pass
' 2>/dev/null || true)

if [ -n "$board_id" ] && [ "$focused_id" = "$board_id" ]; then
  # already focused -> close
  exec "$herdr_bin" pane close "$board_id"
elif [ -n "$board_id" ]; then
  # exists, focus it
  exec "$herdr_bin" pane zoom "$board_id" --on
else
  # not open -> open
  exec "$herdr_bin" plugin pane open \
    --plugin stelow-board \
    --entrypoint board \
    --placement split \
    --direction right \
    --focus
fi