#!/usr/bin/env bash
# Idempotent launcher for the stelow board.
# Pattern: OPEN if no pane exists, FOCUS if exists but not focused, CLOSE if already focused.
# Reference: herdr-file-viewer/scripts/open-file-viewer.sh
#
# Requires: herdr >= 0.7.0, jq OR python3 for JSON parsing
set -uo pipefail

herdr_bin="${HERDR_BIN_PATH:-herdr}"

# Strip trailing slash from path argument if present (cosmetic; herdr is permissive).
target_path="${1%/}"

# Quick existence check — fail fast with a clear message instead of
# herdr's generic "No such file or directory".
if [[ ! -d "$target_path" ]]; then
  echo "stelow-board: directory not found: $target_path" >&2
  exit 2
fi

# Validate the manifest exists before invoking herdr.
if [[ ! -f "$target_path/herdr-plugin.toml" ]]; then
  echo "stelow-board: no herdr-plugin.toml in $target_path" >&2
  echo "  Hint: cd into integrations/herdr/stelow-board/ before linking" >&2
  exit 2
fi

# Validate the binary was built (herdr reads manifest command paths at link time).
if [[ ! -x "$target_path/target/release/stelow-board" ]]; then
  echo "stelow-board: binary not built: $target_path/target/release/stelow-board" >&2
  echo "  Hint: run 'cargo build --release' in $target_path first" >&2
  exit 2
fi

panes_json="$("$herdr_bin" pane list 2>/dev/null || true)"

# Parse JSON — prefer jq (faster), fall back to python3.
parse_json() {
  local input="$1"
  local query="$2"
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$input" | jq -r "$query" 2>/dev/null || true
  else
    printf '%s' "$input" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    ${query}
except Exception:
    pass
" 2>/dev/null || true
  fi
}

focused_id=$(parse_json "$panes_json" 'print(data.get(\"focused_pane_id\", \"\") or \"\")')

board_id=$(parse_json "$panes_json" '
for p in data.get("panes", []):
    if p.get("label") == "Workflow":
        print(p.get("pane_id", ""))
        break
')

if [[ -n "$board_id" && "$focused_id" == "$board_id" ]]; then
  # already focused -> close
  exec "$herdr_bin" pane close "$board_id"
elif [[ -n "$board_id" ]]; then
  # exists, focus it (zoom on, then off to maximize-then-unmaximize for pure focus)
  exec "$herdr_bin" pane zoom "$board_id" --on
else
  # not open -> open as split
  exec "$herdr_bin" plugin pane open \
    --plugin stelow-board \
    --entrypoint board \
    --placement split \
    --direction right \
    --focus
fi