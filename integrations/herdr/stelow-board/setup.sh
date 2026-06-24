#!/usr/bin/env bash
# stelow-board — Build and link herdr plugin from local source.
#
# Usage:
#   ./setup.sh                          # detect plugin dir, build, link, open
#   ./setup.sh /path/to/stelow-board    # explicit plugin source directory
#   ./setup.sh --build-only             # build binary only, skip link
#   ./setup.sh --help                   # this help
#
# Requirements:
#   - herdr >= 0.7.0 (herdr CLI in PATH)
#   - Rust toolchain (cargo)
#
# What it does:
#   1. Locate the plugin source (argument or auto-detect from herdr installed dirs)
#   2. Run cargo build --release
#   3. If herdr CLI is available, link the plugin
#   4. Optionally open the board pane

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()  { echo -e "${BLUE}[INFO]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()   { echo -e "${RED}[ERR]${NC} $*"; }

usage() {
  sed -n '2,16p' "$0"
  exit 0
}

# ── Parse args ──────────────────────────────────────────────────────

PLUGIN_DIR=""
BUILD_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h) usage ;;
    --build-only) BUILD_ONLY=true; shift ;;
    *) PLUGIN_DIR="$1"; shift ;;
  esac
done

# ── Locate plugin source ───────────────────────────────────────────

if [[ -z "$PLUGIN_DIR" ]]; then
  # Auto-detect from herdr installed plugins
  # The hash suffix changes per install, so we glob for the directory.
  for d in "$HOME"/.config/herdr/plugins/github/*/integrations/herdr/stelow-board; do
    if [[ -f "$d/Cargo.toml" ]]; then
      PLUGIN_DIR="$d"
      break
    fi
  done
fi

if [[ -z "$PLUGIN_DIR" ]]; then
  err "Plugin source not found."
  err "Pass the path to the stelow-board source directory:"
  err "  $0 /path/to/stelow/integrations/herdr/stelow-board"
  exit 1
fi

if [[ ! -f "$PLUGIN_DIR/Cargo.toml" ]]; then
  err "No Cargo.toml found in $PLUGIN_DIR"
  err "Make sure this is the stelow-board source directory."
  exit 1
fi

PLUGIN_DIR="$(cd "$PLUGIN_DIR" && pwd)"
info "Plugin source: $PLUGIN_DIR"

# ── Check Rust toolchain ────────────────────────────────────────────

if ! command -v cargo &>/dev/null; then
  err "Rust/Cargo not found in PATH."
  err "Install from: https://rustup.rs/"
  err "Then re-run this script."
  exit 1
fi

info "Rust toolchain found: $(cargo --version)"

# ── Build binary ─────────────────────────────────────────────────────

BINARY="$PLUGIN_DIR/target/release/stelow-board"

if [[ -x "$BINARY" ]]; then
  info "Binary already exists at $BINARY (skip build)"
  info "To rebuild: cd '$PLUGIN_DIR' && cargo build --release"
else
  info "Building stelow-board (cargo build --release)..."
  (cd "$PLUGIN_DIR" && cargo build --release)
  if [[ -x "$BINARY" ]]; then
    ok "Binary built at $BINARY"
  else
    err "Build completed but binary not found at $BINARY"
    exit 1
  fi
fi

if [[ "$BUILD_ONLY" == "true" ]]; then
  info "Build-only mode. Done."
  exit 0
fi

# ── Herdr link ───────────────────────────────────────────────────────

if ! command -v herdr &>/dev/null; then
  warn "herdr CLI not found. Binary is built but not linked."
  warn "Install herdr from https://herdr.dev/ then run:"
  warn "  herdr plugin link '$PLUGIN_DIR'"
  exit 0
fi

info "Checking herdr plugin list..."
if herdr plugin list 2>/dev/null | grep -q "stelow-board"; then
  info "Plugin is already registered in herdr."
  info "If you need to re-link: herdr plugin unlink stelow-board && herdr plugin link '$PLUGIN_DIR'"
else
  info "Linking plugin from $PLUGIN_DIR into herdr..."
  if herdr plugin link "$PLUGIN_DIR"; then
    ok "Plugin linked. Use prefix+w (ctrl+b w) to toggle the board."
  else
    err "herdr plugin link failed."
    err "Try: herdr plugin link '$PLUGIN_DIR'"
    exit 1
  fi
fi

# ── Offer to open the board ──────────────────────────────────────────

echo ""
info "Board is ready. Press prefix+w (ctrl+b w) inside herdr to toggle."
echo "  Or run:  herdr plugin action toggle --plugin stelow-board"
echo ""
info "If the pane doesn't appear, run inside a herdr session:"
echo "    herdr plugin pane open --plugin stelow-board --entrypoint board"
echo ""
ok "Done."
