#!/usr/bin/env bash
#
# Stelow quick install — installs bb when missing, then installs the Stelow plugin.
# Read before piping: https://github.com/calionauta/stelow/blob/main/site/install.sh
#
# Usage:
#   curl -fsSL https://calionauta.github.io/stelow/install.sh | bash
#
# What it does:
#   1. Finds the bb CLI (PATH, or inside a macOS desktop install).
#   2. Missing on Apple Silicon macOS → downloads the bb desktop .dmg,
#      copies it to ~/Applications (no sudo), opens it, waits for its server.
#   3. Missing elsewhere with node present → npm-installs the bb CLI.
#   4. Installs the Stelow plugin (needs the bb server running).
#
# The script never reads from stdin (safe under `curl | bash`) and never
# uses sudo. Anything it cannot do itself ends with one explicit next step.
#
set -euo pipefail

PLUGIN_URL="git:https://github.com/calionauta/bb-plugin-stelow.git"
BB_RELEASE_BASE="https://github.com/get-bb/bb/releases/download/desktop-latest"
# npm 12+ blocks dependency install scripts by default; bb needs these for
# its native add-ons (per https://github.com/get-bb/bb#troubleshooting).
ALLOW_SCRIPTS="better-sqlite3,node-pty,@parcel/watcher"
SERVER_WAIT_SECS=180

# Test hooks (STELOW_TEST_*): override platform detection so the branches
# below can be exercised on any machine. Not set in normal use.
OS="${STELOW_TEST_OS:-$(uname -s)}"
ARCH="${STELOW_TEST_ARCH:-$(uname -m)}"

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

# The plugin commands talk to the bb server — a present CLI is not enough.
server_up() { "$1" plugin list >/dev/null 2>&1; }

install_plugin() {
  log "Installing the Stelow plugin into bb..."
  "$1" plugin install "$PLUGIN_URL" --yes
  log ""
  log "Stelow plugin installed. Open bb, pick Stelow in the navigation, create a card."
}

wait_for_server() {
  local cli="$1" i=0
  log "Waiting for bb to start (up to ${SERVER_WAIT_SECS}s — if macOS asks, click Open)..."
  while [ "$i" -lt "$((SERVER_WAIT_SECS / 3))" ]; do
    if server_up "$cli"; then
      return 0
    fi
    sleep 3
    i=$((i + 1))
  done
  return 1
}

# Apple Silicon macOS: fetch the desktop .dmg, install to ~/Applications,
# open it. Prints the app name on success.
install_bb_macos() {
  local yml version dmg url tmpdmg mnt app_src app_name
  yml="$(curl -fsSL "$BB_RELEASE_BASE/latest-mac.yml")" || {
    log "Could not reach the bb release feed."
    return 1
  }
  version="$(printf '%s\n' "$yml" | grep '^version:' | awk '{print $2}')"
  if [ -z "${version:-}" ]; then
    log "Could not parse the bb release version."
    return 1
  fi
  dmg="bb-${version}-arm64.dmg"
  url="$BB_RELEASE_BASE/$dmg"
  mkdir -p "$HOME/Downloads" "$HOME/Applications"
  if [ -d "$HOME/Applications/bb.app" ]; then
    log "bb desktop is already in ~/Applications — opening it."
  else
    log "Downloading bb desktop $version (~200MB)..."
    tmpdmg="$HOME/Downloads/$dmg"
    curl -fSL --progress-bar -o "$tmpdmg" "$url" || {
      log "Download failed. Get bb at https://getbb.app, open it, then re-run this command."
      return 1
    }
    mnt="$(mktemp -d /tmp/bb-install.XXXXXX)/mnt"
    mkdir -p "$mnt"
    if ! hdiutil attach -nobrowse -readonly -mountpoint "$mnt" "$tmpdmg" >/dev/null; then
      log "Could not mount the downloaded image. Open $tmpdmg by hand, drag bb to Applications, open it, then re-run."
      return 1
    fi
    app_src="$(find "$mnt" -maxdepth 2 -name '*.app' 2>/dev/null | head -n 1)"
    if [ -z "${app_src:-}" ]; then
      hdiutil detach "$mnt" >/dev/null || true
      log "No app found in the image. Open $tmpdmg by hand, drag bb to Applications, open it, then re-run."
      return 1
    fi
    rm -rf "$HOME/Applications/$(basename "$app_src")"
    cp -R "$app_src" "$HOME/Applications/"
    hdiutil detach "$mnt" >/dev/null || true
    log "bb desktop installed to ~/Applications."
  fi
  app_name="$(basename "$(find "$HOME/Applications" -maxdepth 1 -name '*.app' 2>/dev/null | head -n 1)" .app)"
  open -a "$app_name"
}

# Anywhere with node: install the bb CLI globally, then need a running server.
install_bb_npm() {
  log "bb not found. Installing the bb CLI via npm (native add-ons take a few minutes)..."
  # shellcheck disable=SC2086
  npm install -g --allow-scripts="$ALLOW_SCRIPTS" bb-app
  if ! command -v bb >/dev/null 2>&1; then
    # npm's global bin dir is not always on PATH (nvm, custom prefixes).
    local bindir
    bindir="$(dirname "$(npm root -g)")/bin"
    if [ -x "$bindir/bb" ]; then
      export PATH="$bindir:$PATH"
    fi
  fi
}

BB_CLI=""
if BB_CLI="$(resolve_bb)"; then
  if server_up "$BB_CLI"; then
    install_plugin "$BB_CLI"
    exit 0
  fi
  log "bb is installed, but its server is not running."
  log "Open bb (desktop app, or \`npx bb-app@latest\` in another terminal), wait for it to start, then re-run this command."
  exit 1
fi

# bb is missing entirely.
if [ "$OS" = "Darwin" ] && [ "$ARCH" = "arm64" ]; then
  if install_bb_macos; then
    if BB_CLI="$(resolve_bb)" && wait_for_server "$BB_CLI"; then
      install_plugin "$BB_CLI"
      exit 0
    fi
  fi
  log "bb is downloaded — finish opening it, then re-run this command to install the plugin."
  exit 1
elif command -v npm >/dev/null 2>&1; then
  install_bb_npm
  if BB_CLI="$(resolve_bb)" && server_up "$BB_CLI"; then
    install_plugin "$BB_CLI"
    exit 0
  fi
  if [ -n "${BB_CLI:-}" ]; then
    log "bb CLI installed. Start bb once — open the desktop app, or run \`npx bb-app@latest\` in another terminal — then re-run this command."
  else
    log "The bb CLI install did not land on PATH. Install bb at https://getbb.app (or fix npm's global bin dir), then re-run."
  fi
  exit 1
else
  log "bb not found on PATH, so there is nothing to plug into yet."
  log ""
  log "1. Install bb desktop (free): https://getbb.app"
  log "   (On Apple Silicon this script does it for you — this path means auto-install is unavailable here.)"
  log "2. Re-run this command. It will install the Stelow plugin into bb."
  exit 1
fi
