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

# The plugin install needs a reasonably current bb (documented floor: 0.38).
MIN_BB_VERSION="0.38.0"

# version_ge HAVE WANT → true when HAVE >= WANT (numeric, per component).
version_ge() {
  local IFS=.
  local -a have want
  read -ra have <<< "$1"
  read -ra want <<< "$2"
  local i h w
  for i in 0 1 2; do
    h=${have[i]:-0}
    w=${want[i]:-0}
    h=$((10#$h))
    w=$((10#$w))
    [ "$h" -gt "$w" ] && return 0
    [ "$h" -lt "$w" ] && return 1
  done
  return 0
}

BB_CLI=""
if ! BB_CLI="$(resolve_bb)"; then
  log "bb not found, so there is nothing to plug into yet."
  log ""
  log "1. Install bb desktop (free): https://getbb.app"
  log "2. Open bb, then re-run this command. It will install the Stelow plugin."
  exit 1
fi

# Fail-open check: ancient bb fails later with its own errors; only block
# when the version parses AND is definitively below the floor.
BB_VERSION="$("$BB_CLI" --version 2>/dev/null | grep -o '[0-9][0-9.]*' | head -n 1 || true)"
if [ -n "${BB_VERSION:-}" ]; then
  if ! version_ge "$BB_VERSION" "$MIN_BB_VERSION"; then
    log "bb $BB_VERSION is too old — the Stelow plugin needs bb >= $MIN_BB_VERSION."
    log "Update bb, then re-run this command."
    exit 1
  fi
else
  log "(Could not read the bb version; continuing anyway.)"
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
