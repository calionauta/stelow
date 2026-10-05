#!/usr/bin/env bash
# Pre-commit hook: v2 Record enforcement.
#
# Checks all `stelow.json` files in the repo for completed scopes
# without a valid `record.verified: true`. Exits non-zero (blocks
# commit) when violations are found.
#
# Usage:
#   ln -sf ../../scripts/pre-commit-record.sh .git/hooks/pre-commit
#
# Or run standalone (e.g. in CI):
#   bash scripts/pre-commit-record.sh
#
# STELOW_VALIDATE=1 enables runtime validation during scope execution
# (skills/stelow-workflow-scope-executor). This hook is the "at commit time" gate.
#
# The hook is intentionally single-job: validate only scope records.
# Other stelow checks (scope consistency, task count) live in
# execution-critique, not here.

set -euo pipefail
IFS=$'\n\t'

ERRORS=0
HOOK_NAME="pre-commit-record"

# Find all stelow.json files (project roots, recursively up to 3 levels)
# but exclude node_modules, .git, and build output.
STELOW_FILES=$(find . -not -path '*/node_modules/*' -not -path '*/.git/*' \
  -not -path '*/build/*' -not -path '*/dist/*' \
  -name 'stelow.json' -maxdepth 4 2>/dev/null || true)

if [ -z "$STELOW_FILES" ]; then
  echo "[$HOOK_NAME] No stelow.json files found — skipping."
  exit 0
fi

for FILE in $STELOW_FILES; do
  # Fast check: skip if no completed/done scopes (no need to parse).
  # Both statuses count: the CLI commits `done`, older flows `completed`.
  if ! grep -Eq '"status":\s*"(completed|done)"' "$FILE" 2>/dev/null; then
    continue
  fi

  # Use inline node to validate record fields on completed scopes.
  # Fragile but avoids requiring node module resolution in git hooks.
  VIOLATIONS=$(node -e "
    const fs = require('fs');
    const track = JSON.parse(fs.readFileSync('$FILE', 'utf8'));
    const bad = [];
    for (const wf of track.workflows ?? []) {
      for (const sc of wf.scopes ?? []) {
        if (sc.status !== 'completed' && sc.status !== 'done') continue;
        const rec = sc.record ?? {};
        const missing = [];
        if (rec.verified !== true) missing.push('verified');
        const rp = rec.red_proof ?? {};
        if (!rp.failed_command || typeof rp.exit_code !== 'number' || rp.exit_code === 0) missing.push('red_proof');
        if (!rec.freeze_sha) missing.push('freeze_sha');
        if (!rec.baseline || typeof rec.baseline !== 'object' || Object.keys(rec.baseline).length === 0) missing.push('baseline');
        if (missing.length > 0) {
          bad.push(\"\${wf.name}/\${sc.id}: record missing \${missing.join(', ')}\");
        }
      }
    }
    process.stdout.write(bad.join('\\n'));
  " 2>/dev/null || true)

  if [ -n "$VIOLATIONS" ]; then
    echo "[$HOOK_NAME] ⚠️  Completed scopes without valid Record in $FILE:"
    echo "$VIOLATIONS" | while read -r line; do
      echo "  • $line"
    done
    ERRORS=$((ERRORS + 1))
  fi
done

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "[$HOOK_NAME] ❌ $ERRORS file(s) have incomplete Records."
  echo "    Run scope-executor Step 3e-bis to fill missing Records,"
  echo "    or set STELOW_VALIDATE=0 to skip (not recommended)."
  exit 1
fi

echo "[$HOOK_NAME] ✅ All completed scopes have valid Records."
exit 0
