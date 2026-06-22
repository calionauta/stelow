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

# All skills except the orchestrator itself (source)
TARGET_SKILLS=()
for SKILL_DIR in "$PROJECT_ROOT/skills"/*/; do
  SKILL=$(basename "$SKILL_DIR")
  [ "$SKILL" = "stelow" ] && continue
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

for SKILL in "${TARGET_SKILLS[@]}"; do
  [ -n "$TARGET_FILTER" ] && [[ "$SKILL" != *"$TARGET_FILTER"* ]] && continue

  TARGET="$PROJECT_ROOT/skills/$SKILL/references/cli-tools"
  if [ ! -f "$TARGET/README.md" ]; then
    echo "⚠️  $SKILL: cli-tools/ does not exist or is incomplete"
    HAS_MISMATCH=true
    $CHECK_ONLY && continue
    mkdir -p "$TARGET"
  fi

  TARGET_COUNT=$(find "$TARGET" -maxdepth 1 -name '*.md' 2>/dev/null | wc -l | tr -d ' ')

  if [ "$SOURCE_COUNT" -ne "$TARGET_COUNT" ] 2>/dev/null; then
    echo "⚠️  $SKILL: $TARGET_COUNT files (expected $SOURCE_COUNT)"
    HAS_MISMATCH=true
    $CHECK_ONLY && continue

    # Sync: copy missing files, update existing
    for FILE in "$SOURCE"/*.md; do
      BASENAME=$(basename "$FILE")
      cp "$FILE" "$TARGET/$BASENAME"
    done
    echo "   → Synced to $TARGET_COUNT → $SOURCE_COUNT files"
  else
    echo "✅ $SKILL: $TARGET_COUNT files (match)"
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
