#!/usr/bin/env bash
# Idempotent launcher for the stelow board.
# Pattern: OPEN if no pane exists, FOCUS if exists but not focused, CLOSE if already focused.
# Reference: herdr-file-viewer/scripts/open-file-viewer.sh
#
# Requires: herdr >= 0.7.0, jq OR python3 for JSON parsing
#
# Invocation:
#   Via keybind (prefix+w): herdr runtime sets HERDR_PLUGIN_ROOT automatically.
#   Via CLI: herdr plugin action invoke stelow.board.toggle
#   Manual:  ./scripts/open-board.sh /path/to/plugin/root
set -uo pipefail

herdr_bin="${HERDR_BIN_PATH:-herdr}"

# Resolve plugin root: CLI arg wins, fallback to HERDR_PLUGIN_ROOT (set by herdr runtime when action is invoked).
if [[ -n "${1:-}" ]]; then
  target_path="${1%/}"
else
  target_path="${HERDR_PLUGIN_ROOT:-}"
fi

# Fail fast with clear message if no path resolved.
if [[ -z "$target_path" ]]; then
  echo "stelow-board: no plugin path provided. Pass as argument or set HERDR_PLUGIN_ROOT." >&2
  echo "  Usage: ./scripts/open-board.sh <plugin-root-dir>" >&2
  exit 2
fi

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

# Parse JSON — jq preferred, python3 fallback.
# herdr pane list returns: {"id":"cli:pane:list","result":{"panes":[...],"focused_pane_id":"...","type":"pane_list"}}
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

# Get focused pane id from result.panes[] where focused=true
focused_id=$(parse_json "$panes_json" '
for p in data.get("result", {}).get("panes", []):
    if p.get("focused"):
        print(p.get("pane_id", ""))
        break
')

# Find a pane whose label is "Workflow" under result.panes[]
board_id=$(parse_json "$panes_json" '
for p in data.get("result", {}).get("panes", []):
    if p.get("label") == "Workflow":
        print(p.get("pane_id", ""))
        break
')

if [[ -n "$board_id" && "$focused_id" == "$board_id" ]]; then
  # already focused -> close
  exec "$herdr_bin" pane close "$board_id"
elif [[ -n "$board_id" ]]; then
  # exists, focus it
  exec "$herdr_bin" pane zoom "$board_id" --on
else
  # not open -> open as split
  exec "$herdr_bin" plugin pane open \
    --plugin stelow.board \
    --entrypoint board \
    --placement split \
    --direction right \
    --focus
fi
