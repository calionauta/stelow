#!/usr/bin/env bash
#
# Stelow quick install — checks bb is present and running, then installs
# the Stelow plugin. bb itself is a desktop app; get it at https://getbb.app.
# Read before piping: https://github.com/calionauta/stelow/blob/main/site/install.sh
#
# Usage:
#   curl -fsSL https://calionauta.github.io/stelow/install.sh | bash
#
# The script never reads from stdin (safe under `curl | bash`) and never
# uses sudo. If bb is missing or closed, it prints the one next step.
#
set -euo pipefail

PLUGIN_URL="git:https://github.com/calionauta/bb-plugin-stelow.git"

log() { printf '%s\n' "$*"; }

# Locate the bb CLI: PATH first, then inside a macOS desktop install
# (bundle layout varies by release, so search shallow instead of hardcoding).
resolve_bb() {
  if command -v bb >/dev/null 2>&1; then
    command -v bb
    return 0
  fi
  local app cli
  for app in "$HOME/Applications/bb.app" "/Applications/bb.app"; do
    [ -d "$app" ] || continue
    cli="$(find "$app" -maxdepth 4 -name bb -type f 2>/dev/null | head -n 1)"
    if [ -n "${cli:-}" ] && [ -x "$cli" ]; then
      echo "$cli"
      return 0
    fi
  done
  return 1
}

BB_CLI=""
if ! BB_CLI="$(resolve_bb)"; then
  log "bb not found, so there is nothing to plug into yet."
  log ""
  log "1. Install bb desktop (free): https://getbb.app"
  log "2. Open bb, then re-run this command. It will install the Stelow plugin."
  exit 1
fi

# The plugin commands talk to the bb server — a present CLI is not enough.
if ! "$BB_CLI" plugin list >/dev/null 2>&1; then
  log "bb is installed, but its server is not running."
  log "Open bb, wait for it to start, then re-run this command."
  exit 1
fi

log "Installing the Stelow plugin into bb..."
"$BB_CLI" plugin install "$PLUGIN_URL" --yes
log ""
log "Stelow plugin installed. Open bb, pick Stelow in the navigation, create a card."
