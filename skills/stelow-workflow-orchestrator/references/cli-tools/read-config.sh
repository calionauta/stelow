#!/usr/bin/env bash
# read-config.sh — canonical helper for reading Workflow.config from stelow.json
#
# Source this in any skill that needs quality/supervisor/exploration/review_mode/domains_detected:
#   source "$(dirname "${BASH_SOURCE[0]}")/../../stelow-workflow-orchestrator/references/cli-tools/read-config.sh"
#   QUALITY=$(stelow_read_quality)
#
# Reads from stelow.json#workflows[].config (in-progress workflow only).
# See references/cli-tools/read-config.md for full rationale + usage.

# stelow_config <field> [<default>]
# Internal: read a single field from the active workflow's config.
# Prefers `scripts/stelow config get` (single tested parser) when the helper
# is available at the git root; falls back to the inline reader for
# standalone installs without a helper checkout.
# Returns the default if stelow.json absent OR no in-progress workflow OR
# wf.config[field] is null/empty.
stelow_config() {
  local field="$1"
  local default="${2:-}"
  local helper
  helper="$(git rev-parse --show-toplevel 2>/dev/null)/scripts/stelow"
  if [ -x "$helper" ]; then
    "$helper" config get "$field" "$default" 2>/dev/null && return
  fi
  local value=""
  if [ -f "stelow.json" ]; then
    value=$(node -e "
      const t = JSON.parse(require('fs').readFileSync('stelow.json','utf8'));
      const wf = t.workflows.find(w => w.status === 'in-progress');
      process.stdout.write(wf && wf.config && wf.config['$field'] != null && wf.config['$field'] !== ''
        ? String(wf.config['$field']) : '');
    " 2>/dev/null)
  fi
  echo "${value:-$default}"
}

# Public: read quality from active workflow (default: production).
# Legacy appetite lines map to production for every legacy value.
stelow_read_quality() {
  local q
  q=$(stelow_config quality "")
  if [ -n "$q" ]; then echo "$q"; return; fi
  local legacy
  legacy=$(stelow_config appetite "")
  if [ -n "$legacy" ]; then echo "production"; return; fi
  echo "production"
}

# Public: read supervisor knob from active workflow (default: high).
# Legacy appetite lines map to high for every legacy value.
stelow_read_supervisor() {
  local s
  s=$(stelow_config supervisor "")
  if [ -n "$s" ]; then echo "$s"; return; fi
  local legacy
  legacy=$(stelow_config appetite "")
  if [ -n "$legacy" ]; then echo "high"; return; fi
  echo "high"
}

# Public: read exploration count from active workflow (default: 3).
# Legacy appetite maps Lean->2, Core->3, Complete->5.
stelow_read_exploration_count() {
  local c
  c=$(stelow_config exploration_count "")
  if [ -n "$c" ]; then echo "$c"; return; fi
  local legacy
  legacy=$(stelow_config appetite "")
  case "$legacy" in
    Lean) echo "2" ;;
    Complete) echo "5" ;;
    Core|"") echo "3" ;;
    *) echo "3" ;;
  esac
}

# Public: read exploration hybrid flag (default: true whenever count >= 2).
stelow_read_exploration_hybrid() {
  local h
  h=$(stelow_config exploration_hybrid "")
  if [ -n "$h" ]; then echo "$h"; return; fi
  echo "true"
}

# Deprecated: read appetite from active workflow (default: Core).
# Kept for one release line so old states keep working. New code must use
# the knob readers above.
stelow_read_appetite() {
  stelow_config appetite "Core"
}

# Public: read review_mode from active workflow (default: Product Spec + Interface + Scopes)
stelow_read_review_mode() {
  stelow_config review_mode "Product Spec + Interface + Scopes"
}

# Public: read red_first kill-switch (default: strict on production, advisory on experimental).
# Single source: Workflow.config.red_first. STELOW_RED_FIRST env overrides
# any stored value (enforced here and by `stelow config get red_first`).
stelow_read_red_first() {
  case "${STELOW_RED_FIRST:-}" in
    strict|advisory|off) echo "$STELOW_RED_FIRST"; return ;;
  esac
  local helper
  helper="$(git rev-parse --show-toplevel 2>/dev/null)/scripts/stelow"
  if [ -x "$helper" ]; then
    "$helper" config get red_first "" 2>/dev/null && return
  fi
  local value=""
  if [ -f "stelow.json" ]; then
    value=$(node -e "
      const t = JSON.parse(require('fs').readFileSync('stelow.json','utf8'));
      const wf = t.workflows.find(w => w.status === 'in-progress');
      const cfg = (wf && wf.config) || {};
      const v = cfg.red_first;
      if (v === 'strict' || v === 'advisory' || v === 'off') { process.stdout.write(v); }
      else if (cfg.quality === 'experimental') { process.stdout.write('advisory'); }
      else { process.stdout.write('strict'); }
    " 2>/dev/null)
  fi
  echo "${value:-strict}"
}

# Public: read domains_detected as JSON array (default: [])
stelow_read_domains() {
  local helper
  helper="$(git rev-parse --show-toplevel 2>/dev/null)/scripts/stelow"
  if [ -x "$helper" ]; then
    "$helper" config get domains_detected "[]" 2>/dev/null && return
  fi
  if [ -f "stelow.json" ]; then
    node -e "
      const t = JSON.parse(require('fs').readFileSync('stelow.json','utf8'));
      const wf = t.workflows.find(w => w.status === 'in-progress');
      process.stdout.write(wf && wf.config && Array.isArray(wf.config.domains_detected)
        ? JSON.stringify(wf.config.domains_detected) : '[]');
    " 2>/dev/null
    return
  fi
  echo "[]"
}