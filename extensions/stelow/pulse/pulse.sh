#!/bin/bash
# Stelow Pulse — periodic inbox processor
# Processes inbox items autonomously, creates workflows, logs provenance.
# Designed to run via cron/systemd/launchd/Task Scheduler.
#
# Cross-platform: macOS, Linux, Windows (Git Bash / WSL).
# Uses only POSIX-compatible constructs (no grep -P, no flock).
#
# Usage:
#   ./pulse.sh                                # Process up to 10 items (default)
#   ./pulse.sh --max-items 3                  # Process up to 3 items
#   ./pulse.sh --max-items 1                  # Process exactly 1 item
#   ./pulse.sh --max-items 0                  # Process ALL items (no cap)
#   ./pulse.sh --force                        # Process even if paused
#   ./pulse.sh --dry-run                      # Show what would be done, don't execute
#   ./pulse.sh --timeout 60                   # Max seconds for pi --print (default: 120)
#
# Exit codes:
#   0 — processed successfully (or nothing to do)
#   1 — lock contention (another pulse running)
#   2 — inbox empty
#   3 — user active (conflict avoidance)
#   4 — pi --print failed

set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────
PULSE_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$PULSE_DIR/../.." && pwd)"
STELOW_JSON="$PROJECT_DIR/stelow.json"
INBOX="$PROJECT_DIR/.stelow/inbox/items.md"
LOG="$PULSE_DIR/pulse.log"
LOCKFILE="$PULSE_DIR/pulse.lock"
PAUSEFILE="$PULSE_DIR/pulse.pause"
PROVENANCE="$PROJECT_DIR/.stelow/inbox/history.jsonl"
MODEL="${PULSE_MODEL:-}"
USER_ACTIVITY_MINUTES="${PULSE_USER_ACTIVITY_MINUTES:-15}"
MAX_WAIT_SECONDS="${PULSE_TIMEOUT:-120}"

# ── Parse args (portable while-loop with shift) ──────────────────────
DRY_RUN=false
FORCE=false
MAX_ITEMS=10

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)           DRY_RUN=true; shift ;;
    --force)             FORCE=true; shift ;;
    --once)              shift ;;
    --max-items=*)       MAX_ITEMS="${1#*=}"; shift ;;
    --max-items)         MAX_ITEMS="$2"; shift 2 ;;
    --timeout=*)         MAX_WAIT_SECONDS="${1#*=}"; shift ;;
    --timeout)           MAX_WAIT_SECONDS="$2"; shift 2 ;;
    *)                   shift ;;  # skip unknown
  esac
done

# ── Helpers ──────────────────────────────────────────────────────────
log() { echo "[$(date '+%Y-%m-%dT%H:%M:%S')] $*" >> "$LOG"; }

# ── Checks ───────────────────────────────────────────────────────────

# 1. Inbox empty?
if [ ! -s "$INBOX" ]; then
  log "Inbox empty — nothing to process"
  exit 2
fi

# 2. Paused? (skip unless --force)
if [ -f "$PAUSEFILE" ] && [ "$FORCE" != "true" ]; then
  log "Pulse paused — remove $PAUSEFILE to resume"
  exit 0
fi

# 3. Lock (prevent concurrent pulse runs) — mkdir is atomic on macOS, Linux, NTFS
if ! mkdir "$LOCKFILE" 2>/dev/null; then
  log "Another pulse already running"
  exit 1
fi
trap 'rm -rf "$LOCKFILE"' EXIT

# 4. User activity detection
#    a) stelow.json modified recently (user ran /sw-next, /sw-start, etc.)
#    b) pi process running interactively (user inside pi session)
if [ "$FORCE" != "true" ]; then
  # 4a. stelow.json mtime check
  if [ -f "$STELOW_JSON" ]; then
    # macOS stat: -f "%m" (seconds). Linux stat: -c "%Y" (seconds)
    LAST_MODIFIED=$(stat -f "%m" "$STELOW_JSON" 2>/dev/null || stat -c "%Y" "$STELOW_JSON" 2>/dev/null || echo "0")
    NOW=$(date +%s)
    if [ "$LAST_MODIFIED" != "0" ] && [ "$((NOW - LAST_MODIFIED))" -lt "$((USER_ACTIVITY_MINUTES * 60))" ]; then
      log "User activity detected (stelow.json modified < ${USER_ACTIVITY_MINUTES}m ago) — skipping"
      exit 3
    fi
  fi

  # 4b. Running pi interactive session detection
  #     pgrep matches process names; -x = exact, -q = quiet.
  #     "pi" is the CLI binary — if running non-interactively (--print), skip.
  #     We only care about interactive pi sessions.
  if command -v pgrep &>/dev/null; then
    PI_PIDS=$(pgrep -x pi 2>/dev/null || true)
    if [ -n "$PI_PIDS" ]; then
      # Check if any pi process has a TTY (interactive) — not --print mode
      for PID in $PI_PIDS; do
        if [ -t "$(ls -la "/proc/$PID/fd/0" 2>/dev/null | grep -c 'tty\|pts')" ] 2>/dev/null ||
           { command -V lsof &>/dev/null && lsof -p "$PID" -a -d 0 -F t 2>/dev/null | grep -q 't\|T' 2>/dev/null; }; then
          log "User activity detected (pi process PID $PID running interactively) — skipping"
          exit 3
        fi
      done
    fi
  fi
fi

# ── Determine items to process ──────────────────────────────────────
# Filter: exclude comments (#) and items marked for human-in-the-loop:
#   [human-in-the-loop] / [hitl] / [human] (backward compat)
ITEM_COUNT=$(grep -v '^#' "$INBOX" | grep -c -v -E '\[(human(-in-the-loop)?|hitl)\]')

if [ "$MAX_ITEMS" -eq 0 ]; then
  # Uncap — user explicitly asked for ALL
  TO_PROCESS=$ITEM_COUNT
  LABEL="all $ITEM_COUNT (uncapped)"
  if [ "$ITEM_COUNT" -gt 20 ]; then
    log "⚠️  WARNING: Processing ALL $ITEM_COUNT items (--max-items 0). This may take a while."
  fi
elif [ "$MAX_ITEMS" -ge "$ITEM_COUNT" ]; then
  TO_PROCESS=$ITEM_COUNT
  LABEL="all $ITEM_COUNT"
else
  TO_PROCESS=$MAX_ITEMS
  LABEL="$TO_PROCESS of $ITEM_COUNT"
fi

FIRST_ITEM=$(grep -v '^#' "$INBOX" | grep -v -E '\[(human(-in-the-loop)?|hitl)\]' | head -1 | sed 's/^ *//;s/ *$//')
log "Inbox: $ITEM_COUNT item(s), processing $LABEL, first: ${FIRST_ITEM:0:80}..."

if [ "$DRY_RUN" = "true" ]; then
  log "DRY RUN: would process $LABEL items with model ${MODEL:-harness default} (timeout: ${MAX_WAIT_SECONDS}s)"
  echo "📡 [DRY RUN] Would process $LABEL item(s)"
  echo "   Model: ${MODEL:-harness default}"
  echo "   Timeout: ${MAX_WAIT_SECONDS}s"
  echo "   First: ${FIRST_ITEM:0:80}"
  exit 0
fi

# ── Save inbox snapshot (for recovery if interrupted) ────────────────
INBOX_BACKUP="$PULSE_DIR/.inbox-snapshot"
cp "$INBOX" "$INBOX_BACKUP" 2>/dev/null || true

# ── Execute pi --print headless ──────────────────────────────────────
SYSTEM_PROMPT="$PULSE_DIR/pulse-system.md"
TASK_PROMPT=$(cat "$PULSE_DIR/pulse-task.md")

log "Running pi --print (model: ${MODEL:-harness default}, max-items: $TO_PROCESS, timeout: ${MAX_WAIT_SECONDS}s)..."

# Inject max-items into the task prompt
EFFECTIVE_TASK="$TASK_PROMPT

PROCESSING LIMIT: Process up to $TO_PROCESS item(s) this cycle.
If there are fewer, process all. If there are more, stop after $TO_PROCESS."

# Run with timeout to prevent hangs
# timeout is POSIX (IEEE 1003.1-2024+) — available on macOS, Linux, Git Bash
# Only pass --model when PULSE_MODEL is explicitly set; otherwise use harness default
if [ -n "$MODEL" ]; then
  PI_OUTPUT=$(timeout "$MAX_WAIT_SECONDS" pi --print --model "$MODEL" \
    --append-system-prompt @"$SYSTEM_PROMPT" \
    "$EFFECTIVE_TASK" \
    2>&1) && PI_EXIT=$? || PI_EXIT=$?
else
  PI_OUTPUT=$(timeout "$MAX_WAIT_SECONDS" pi --print \
    --append-system-prompt @"$SYSTEM_PROMPT" \
    "$EFFECTIVE_TASK" \
    2>&1) && PI_EXIT=$? || PI_EXIT=$?
fi

# timeout exit code 124 = command timed out
if [ "$PI_EXIT" -eq 124 ]; then
  log "❌ pi --print timed out after ${MAX_WAIT_SECONDS}s"
  exit 4
fi

log "pi --print exit code: $PI_EXIT"

# ── Log provenance ────────────────────────────────────────────────────
WORKFLOW_NAME=$(echo "$PI_OUTPUT" | sed -n 's/.*WORKFLOW:[[:space:]]*//p' | head -1)
WORKFLOW_DIR=$(echo "$PI_OUTPUT" | sed -n 's/.*DIR:[[:space:]]*//p' | head -1)
# Parse COUNT: from LLM output — number of items actually processed this run
PROCESSED_COUNT=$(echo "$PI_OUTPUT" | sed -n 's/.*COUNT:[[:space:]]*//p' | head -1)
PROCESSED_COUNT="${PROCESSED_COUNT:-1}"

mkdir -p "$(dirname "$PROVENANCE")"
# Escape JSON-special chars in item text (" and backslash)
ESCAPED_ITEM=$(echo "$FIRST_ITEM" | sed 's/\\/\\\\/g; s/"/\\"/g')
REMAINING=$((ITEM_COUNT > TO_PROCESS ? ITEM_COUNT - TO_PROCESS : 0))
[ "$REMAINING" -lt 0 ] && REMAINING=0
PROVENANCE_ENTRY="{\"ts\":\"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\",\"item\":\"${ESCAPED_ITEM}\",\"workflow\":\"${WORKFLOW_NAME:-unknown}\",\"dir\":\"${WORKFLOW_DIR:-}\",\"exit_code\":$PI_EXIT,\"items_processed\":$PROCESSED_COUNT,\"items_remaining\":$REMAINING}"
echo "$PROVENANCE_ENTRY" >> "$PROVENANCE"

# ── Verify + recover ─────────────────────────────────────────────────
# Check if claimed workflow dir exists
WORKFLOW_EXISTS=false
if [ "$PI_EXIT" -eq 0 ] && [ -n "$WORKFLOW_DIR" ] && [ -f "$PROJECT_DIR/$WORKFLOW_DIR/index.json" ]; then
  WORKFLOW_EXISTS=true
fi

# Check inbox integrity: if pi failed but inbox changed, restore snapshot
INBOX_CHANGED=false
diff -q "$INBOX_BACKUP" "$INBOX" &>/dev/null || INBOX_CHANGED=true

if [ "$PI_EXIT" -eq 0 ]; then
  if [ "$WORKFLOW_EXISTS" = true ]; then
    log "✅ Pulse complete — workflow: ${WORKFLOW_NAME:-unknown}, items processed: $PROCESSED_COUNT, remaining: $REMAINING"
    rm -f "$INBOX_BACKUP"
    echo "$PI_OUTPUT"
    exit 0
  else
    log "⚠️  CRITICAL: pi --print reported success but workflow '$WORKFLOW_DIR' not found on disk"
    log "⚠️  If inbox items were removed, they may be lost. Check $INBOX manually."
    log "⚠️  Inbox backup saved at $INBOX_BACKUP (restore with: cp $INBOX_BACKUP $INBOX)"
    exit 4
  fi
else
  log "❌ Pulse failed (exit: $PI_EXIT) — will retry next cycle"
  if [ "$INBOX_CHANGED" = true ]; then
    log "⚠️  Inbox was modified despite failure — restoring from backup"
    cp "$INBOX_BACKUP" "$INBOX"
    rm -f "$INBOX_BACKUP"
  fi
  echo "$PI_OUTPUT" | tail -5 >> "$LOG"
  echo "$PI_OUTPUT"
  rm -f "$INBOX_BACKUP"
  exit 4
fi
