#!/usr/bin/env bash
# scripts/check-extensions-freeze.sh
#
# SCOPE-5: extensions freeze guard.
# Asserts that no file under `extensions/` and no WORKFLOW_COMMANDS declaration
# has changed relative to the merge-base with `main`.
#
# This guard exists because the `scope-5` "skills-only" refactor is removing the
# extensions/ tree. While the refactor is in progress, accidental commits that
# touch extensions/ risk diverging the two codebases. Once the refactor merges,
# the guard locks the frozen-state boundary — no drift back into extensions/.
#
# Kill-switch / override (temporary use only; document the reason):
#   touch .extensions-freeze-override
#   git commit -m "chore: lift extensions freeze for <reason>" .extensions-freeze-override
#
# Exit 0 on pass (no frozen files changed), 1 with `::error::` on violation.
# CI invocation:
#   bash scripts/check-extensions-freeze.sh
# Local invocation:
#   bash scripts/check-extensions-freeze.sh

set -euo pipefail

# ── paths ──────────────────────────────────────────────────────────────────

OVERRIDE_MARKER=".extensions-freeze-override"
COMMANDS_FILE="extensions/stelow/adapters/commands/dispatcher.ts"

# ── override ────────────────────────────────────────────────────────────────

if [ -f "$OVERRIDE_MARKER" ]; then
  printf '::warning::%s exists — extensions freeze bypassed\n' "$OVERRIDE_MARKER"
  printf 'OK: freeze override active (remove %s to re-enable)\n' "$OVERRIDE_MARKER"
  exit 0
fi

# ── merge-base with main ────────────────────────────────────────────────────

# Resolve the common ancestor so this script works correctly in both:
#   - CI: comparing the PR branch against main
#   - Local: comparing the current branch against main
MERGE_BASE=$(git merge-base HEAD origin/main 2>/dev/null) || {
  # Fallback: origin/main may not be available (shallow clone); use the
  # main-branch HEAD directly. In that case we still correctly catch new
  # changes — we simply lack a baseline for the already-frozen tree.
  MERGE_BASE="origin/main"
  printf '::warning::Could not resolve merge-base; falling back to origin/main\n' >&2
}

# ── collect violations ──────────────────────────────────────────────────────

violations=()

# 1. Any file inside extensions/ that differs from merge-base
while IFS= read -r f; do
  violations+=("$f")
done < <(git diff --name-only "$MERGE_BASE" HEAD -- extensions/ 2>/dev/null | grep -v '^$' || true)

# 2. WORKFLOW_COMMANDS constant in dispatcher.ts
if git diff --quiet "$MERGE_BASE" HEAD -- "$COMMANDS_FILE" 2>/dev/null; then
  : # clean
else
  violations+=("$COMMANDS_FILE (WORKFLOW_COMMANDS changed)")
fi

# ── report ─────────────────────────────────────────────────────────────────

if [ ${#violations[@]} -eq 0 ]; then
  printf 'OK: extensions tree and WORKFLOW_COMMANDS are frozen (baseline: %s)\n' \
    "$(git rev-parse --short "$MERGE_BASE" 2>/dev/null || echo 'origin/main')"
  exit 0
fi

printf '::error::Extensions freeze violated — the following file(s) changed:\n' >&2
for v in "${violations[@]}"; do
  printf '::error::  %s\n' "$v" >&2
done
printf '::error::To override temporarily: touch %s && git commit -m "chore: lift freeze for <reason>" %s\n' \
  "$OVERRIDE_MARKER" "$OVERRIDE_MARKER" >&2
exit 1
