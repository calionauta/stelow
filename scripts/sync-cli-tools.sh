#!/usr/bin/env bash
#
# sync-cli-tools.sh
# Synchronizes references/cli-tools/ from orchestrator to all sub-skills.
# Run after adding/modifying any cli-tools file to keep skills in sync.
#
# Usage:
#   ./scripts/sync-cli-tools.sh              # sync all sub-skills
#   ./scripts/sync-cli-tools.sh --check-only  # only report mismatches
#   ./scripts/sync-cli-tools.sh --skill calm  # sync a specific skill
#
set -euo pipefail

shopt -s nullglob

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

SOURCE="$PROJECT_ROOT/skills/stelow-product-orchestrator/references/cli-tools"

# Files in SOURCE that are orchestrator-only and should NOT be synced to sub-skills
SYNC_EXCLUDE=("context-efficiency.md" "execution-loop.md")

# All skills except the orchestrator itself (source)
TARGET_SKILLS=()
for SKILL_DIR in "$PROJECT_ROOT/skills"/*/; do
  SKILL=$(basename "$SKILL_DIR")
  [ "$SKILL" = "stelow-product-orchestrator" ] && continue
  TARGET_SKILLS+=("$SKILL")
done

CHECK_ONLY=false
TARGET_FILTER=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check-only) CHECK_ONLY=true; shift ;;
    --skill) TARGET_FILTER="$2"; shift 2 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

if [ ! -d "$SOURCE" ]; then
  echo "ERROR: Source cli-tools not found at $SOURCE"
  exit 1
fi

SOURCE_COUNT=$(find "$SOURCE" -maxdepth 1 -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
echo "=== cli-tools Sync ==="
echo "Source: $SOURCE ($SOURCE_COUNT files)"
echo ""

HAS_MISMATCH=false

# Per-file diff tracking (declared here to satisfy `set -u` when empty)
STALE_FILES=()

for SKILL in "${TARGET_SKILLS[@]}"; do
  # Reset per-skill tracking
  STALE_FILES=()
  [ -n "$TARGET_FILTER" ] && [[ "$SKILL" != *"$TARGET_FILTER"* ]] && continue

  TARGET="$PROJECT_ROOT/skills/$SKILL/references/cli-tools"
  if [ ! -f "$TARGET/README.md" ]; then
    echo "⚠️  $SKILL: cli-tools/ does not exist or is incomplete"
    HAS_MISMATCH=true
    $CHECK_ONLY && continue
    mkdir -p "$TARGET"
  fi

  TARGET_COUNT=$(find "$TARGET" -maxdepth 1 -name '*.md' 2>/dev/null | wc -l | tr -d ' ')

  # Determine expected file count (source minus excluded files)
  EXPECTED_COUNT=$((SOURCE_COUNT - ${#SYNC_EXCLUDE[@]}))
  # Build find-prune expression to exclude orchestrator-only files from search
  PRUNE_EXPR=""
  for EXCL in "${SYNC_EXCLUDE[@]}"; do
    PRUNE_EXPR="$PRUNE_EXPR ! -name '$EXCL'"
  done
  eval "TARGET_FILES=\$(find \"$TARGET\" -maxdepth 1 -name '*.md' $PRUNE_EXPR 2>/dev/null | wc -l | tr -d ' ')"

  for FILE in "$SOURCE"/*.md; do
    BASENAME=$(basename "$FILE")
    # Skip excluded files
    for EXCL in "${SYNC_EXCLUDE[@]}"; do
      if [ "$BASENAME" = "$EXCL" ]; then
        continue 2
      fi
    done
    if [ ! -f "$TARGET/$BASENAME" ]; then
      STALE_FILES+=("$BASENAME (missing)")
    elif ! cmp -s "$FILE" "$TARGET/$BASENAME"; then
      STALE_FILES+=("$BASENAME (content differs)")
    fi
  done

  # Check for stale excluded files (from previous syncs that should now be removed)
  STALE_EXCL=false
  for EXCL in "${SYNC_EXCLUDE[@]}"; do
    [ -f "$TARGET/$EXCL" ] && STALE_EXCL=true
  done

  if [ "${#STALE_FILES[@]}" -gt 0 ] || $STALE_EXCL; then
    echo "⚠️  $SKILL: out of sync"
    if [ "${#STALE_FILES[@]}" -gt 0 ]; then
      for F in "${STALE_FILES[@]}"; do
        echo "   stale: $F"
      done
    fi
    $STALE_EXCL && echo "   stale excluded: ${SYNC_EXCLUDE[*]}"
    HAS_MISMATCH=true
    $CHECK_ONLY && continue

    # Sync stale source files to target (only the ones that differ)
    if [ "${#STALE_FILES[@]}" -gt 0 ]; then
      for BASENAME in "${STALE_FILES[@]}"; do
        NAME="${BASENAME%% *}"  # strip " (missing)" / " (content differs)"
        cp "$SOURCE/$NAME" "$TARGET/$NAME"
      done
    fi
    # Remove excluded files from target (cleanup from previous syncs)
    for EXCL in "${SYNC_EXCLUDE[@]}"; do
      rm -f "$TARGET/$EXCL"
    done
    echo "   → Synced ${#STALE_FILES[@]} stale"
  else
    ALL_COUNT=$(find "$TARGET" -maxdepth 1 -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
    echo "✅ $SKILL: ${ALL_COUNT} files (match)"
  fi
done

echo ""
if $HAS_MISMATCH; then
  if $CHECK_ONLY; then
    echo "❌ Mismatches found (${CHECK_ONLY:+check mode — no changes made})"
    echo "   Run without --check-only to sync."
  else
    echo "✅ All skills synced."
  fi
else
  echo "✅ All skills match source."
fi
