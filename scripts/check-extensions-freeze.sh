#!/usr/bin/env bash
# scripts/check-extensions-freeze.sh
#
# Skills-only refactor freeze guard (SCOPE-5).
# Fails CI if any file under extensions/ or WORKFLOW_COMMANDS/ changes while
# the skills-only refactor is in progress.
#
# The freeze is active when .stelow/refactor-freeze-active exists.
# The kill-switch is: rm .stelow/refactor-freeze-active
#
# CI invocation (adds GitHub Actions ::error:: annotations):
#   bash scripts/check-extensions-freeze.sh
#
# Local dry-run:
#   bash scripts/check-extensions-freeze.sh --verbose
#
# Exit 0 on pass (no violations or freeze not active), 1 on violation.

set -euo pipefail

VERBOSE=""
if [ "${1:-}" = "--verbose" ] || [ "${STELOW_FREEZE_VERBOSE:-}" = "1" ]; then
  VERBOSE=1
fi

FREEZE_MARKER=".stelow/refactor-freeze-active"
PROTECTED_DIRS="extensions WORKFLOW_COMMANDS"

# ── 1. Freeze active? ────────────────────────────────────────────────────────

if [ ! -f "$FREEZE_MARKER" ]; then
  [ -z "$VERBOSE" ] || printf 'FREEZE INACTIVE: %s not present\n' "$FREEZE_MARKER"
  exit 0
fi

# ── 2. Find files that changed in extensions/ or WORKFLOW_COMMANDS/ ─────────────

# Compare HEAD vs the merge-base with main (works for both PR branches and direct
# pushes). Falls back to HEAD^1 if merge-base is the same as HEAD (shallow clones
# or single-commit branches).
MERGE_BASE=$(git merge-base HEAD main 2>/dev/null || echo HEAD)
PREVIOUS="${MERGE_BASE}"

# Collect changed files under protected dirs.
changed=$(git diff --name-only "$PREVIOUS" HEAD 2>/dev/null | \
          grep -E '^extensions/|^WORKFLOW_COMMANDS/' || true)

if [ -z "$changed" ]; then
  [ -z "$VERBOSE" ] || printf 'OK: no changes in %s\n' "$PROTECTED_DIRS"
  exit 0
fi

# ── 3. Freeze violation ───────────────────────────────────────────────────────

printf '::error::extensions/WORKFLOW_COMMANDS freeze violation detected\n' >&2
printf '::error::The following files changed while the refactor is in progress:\n' >&2
while IFS= read -r file; do
  printf '::error::  %s\n' "$file" >&2
done <<< "$changed"
printf '::error::\n' >&2
printf '::error::To lift the freeze temporarily (EMERGENCY ONLY):\n' >&2
printf '::error::  rm %s\n' "$FREEZE_MARKER" >&2
printf '::error::To safely make an approved change: commit to a feature branch,\n' >&2
printf '::error::get human approval, then update %s\n' "$FREEZE_MARKER" >&2
printf '::error::See .plans/skills-only/plan.md §12 and SCOPE-5 for the freeze policy.\n' >&2

exit 1
