#!/usr/bin/env bash
#
# stelow Pulse — standalone setup.
# Copies bundled Pulse scripts to a project's .stelow/pulse/ directory
# and prepares the inbox. Does NOT require the pi extension or an
# interactive pi session — useful for:
#
#   • Initial setup before the user has installed the stelow extension
#   • CI/CD pipelines that need Pulse scripts without a pi dependency
#   • Cron/systemd/launchd install scripts that pre-stage the project
#
# Usage:
#   ./scripts/setup-pulse.sh                        # setup in cwd
#   ./scripts/setup-pulse.sh --project-dir /path    # setup in specific dir
#   ./scripts/setup-pulse.sh --dry-run              # preview only
#   ./scripts/setup-pulse.sh --force                # overwrite existing scripts
#
# Exit codes:
#   0 — setup complete (or nothing to do)
#   1 — bundled scripts not found (packaging error)
#   2 — project directory doesn't exist or isn't writable
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
BUNDLED_PULSE="$PACKAGE_DIR/extensions/stelow/pulse"

# Parse args
PROJECT_DIR="$(pwd)"
DRY_RUN=false
FORCE=false

while [ $# -gt 0 ]; do
  case "$1" in
    --project-dir)   PROJECT_DIR="$2"; shift 2 ;;
    --project-dir=*) PROJECT_DIR="${1#*=}"; shift ;;
    --dry-run)       DRY_RUN=true; shift ;;
    --force)         FORCE=true; shift ;;
    --help|-h)
      echo "Usage: setup-pulse.sh [--project-dir DIR] [--dry-run] [--force]"
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

# Colors
if [[ -t 1 ]] && command -v tput &>/dev/null && [[ $(tput colors 2>/dev/null || echo 0) -ge 8 ]]; then
  BOLD="$(tput bold)"  RESET="$(tput sgr0)"
  GREEN="$(tput setaf 2)" YELLOW="$(tput setaf 3)" BLUE="$(tput setaf 4)" RED="$(tput setaf 1)"
else
  BOLD="" RESET="" GREEN="" YELLOW="" BLUE="" RED=""
fi

info() { echo "${BLUE}[info]${RESET} $*"; }
ok()   { echo "${GREEN}[ok]${RESET} $*"; }
warn() { echo "${YELLOW}[warn]${RESET} $*"; }
err()  { echo "${RED}[err]${RESET} $*"; }

# ── 1. Validate bundled location ──────────────────────────────────────
if [[ ! -d "$BUNDLED_PULSE" ]]; then
  err "Bundled Pulse scripts not found at: $BUNDLED_PULSE"
  err "This is a packaging issue. The extension should ship scripts at"
  err "  extensions/stelow/pulse/"
  exit 1
fi
info "Bundled Pulse scripts: $BUNDLED_PULSE"

# ── 2. Validate project dir ───────────────────────────────────────────
if [[ ! -d "$PROJECT_DIR" ]]; then
  err "Project directory does not exist: $PROJECT_DIR"
  exit 2
fi
if [[ ! -w "$PROJECT_DIR" ]]; then
  err "Project directory not writable: $PROJECT_DIR"
  exit 2
fi
info "Project directory: $PROJECT_DIR"

# ── 3. Copy scripts ───────────────────────────────────────────────────
PULSE_DIR="$PROJECT_DIR/.stelow/pulse"
INBOX_DIR="$PROJECT_DIR/.stelow/inbox"

if [[ -f "$PULSE_DIR/pulse.sh" ]] || [[ -f "$PULSE_DIR/pulse.ps1" ]]; then
  if [[ "$FORCE" != "true" ]]; then
    warn "Pulse scripts already installed at $PULSE_DIR"
    warn "Use --force to overwrite."
    exit 0
  fi
  warn "Overwriting existing scripts (--force)"
fi

REQUIRED_FILES=(pulse.sh pulse.ps1 pulse-task.md pulse-system.md SETUP.md)
MISSING=()
for f in "${REQUIRED_FILES[@]}"; do
  [[ -f "$BUNDLED_PULSE/$f" ]] || MISSING+=("$f")
done
if [[ ${#MISSING[@]} -gt 0 ]]; then
  err "Bundled Pulse is missing files: ${MISSING[*]}"
  exit 1
fi

if [[ "$DRY_RUN" == "true" ]]; then
  info "[dry-run] Would create: $PULSE_DIR"
  info "[dry-run] Would create: $INBOX_DIR"
  for f in "${REQUIRED_FILES[@]}"; do
    info "[dry-run] Would copy: $f"
  done
  exit 0
fi

mkdir -p "$PULSE_DIR"
for f in "${REQUIRED_FILES[@]}"; do
  cp "$BUNDLED_PULSE/$f" "$PULSE_DIR/$f"
done
ok "Copied ${#REQUIRED_FILES[@]} files to $PULSE_DIR"

# Make scripts executable
chmod +x "$PULSE_DIR/pulse.sh" 2>/dev/null || true

# ── 4. Prepare inbox ──────────────────────────────────────────────────
mkdir -p "$INBOX_DIR"
INBOX_FILE="$INBOX_DIR/items.md"
if [[ ! -f "$INBOX_FILE" ]]; then
  cat > "$INBOX_FILE" <<'EOF'
# Pulse inbox — add items below (one per line). Pulse processes them
# in order. Prefix with [human-in-the-loop], [hitl], or [human] to
# skip automatic processing.
#
# Examples:
# Add OAuth login flow
# [hitl] Decide pricing strategy for Q4
# Add export to CSV feature
EOF
  ok "Created inbox at $INBOX_FILE"
else
  info "Inbox already exists at $INBOX_FILE"
fi

# ── 5. Summary + next steps ───────────────────────────────────────────
echo ""
echo "${BOLD}Pulse is ready.${RESET}"
echo ""
echo "  📂 Scripts:    $PULSE_DIR"
echo "  📥 Inbox:      $INBOX_FILE"
echo ""
echo "${BOLD}Next steps:${RESET}"
echo ""
echo "  1. Test it:"
echo "     bash $PULSE_DIR/pulse.sh --dry-run"
echo ""
echo "  2. Schedule it (cron / launchd / systemd / Task Scheduler):"
echo "     See $PULSE_DIR/SETUP.md for platform instructions."
echo ""
echo "  3. (Optional) Use the stelow extension for /sw-pulse commands:"
echo "     /sw-pulse status"
echo "     /sw-pulse pause   (and resume)"
echo "     /sw-pulse process (force-run)"
echo ""