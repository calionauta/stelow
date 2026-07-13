#!/usr/bin/env bash
# read-config.sh — canonical helper for reading Workflow.config from stelow.json
#
# Source this in any skill that needs appetite/review_mode/domains_detected:
#   source "$(dirname "${BASH_SOURCE[0]}")/../../stelow-product-orchestrator/references/cli-tools/read-config.sh"
#   APPETITE=$(stelow_read_appetite)
#
# Canonical source as of v0.50.0: stelow.json#workflows[].config (in-progress workflow only).
# Fallback: .stelow/{date}/{dir}/index.json (legacy pre-v0.50.0).
#
# See references/cli-tools/read-config.md for full rationale + migration guide.

# stelow_config <field> [<default>]
# Internal: read a single field from the active workflow's config.
stelow_config() {
  local field="$1"
  local default="${2:-}"
  local value=""
  if [ -f "stelow.json" ]; then
    # Filter for in-progress workflows only (avoid stale archived entries)
    value=$(node -e "
      const t = JSON.parse(require('fs').readFileSync('stelow.json','utf8'));
      const wf = t.workflows.find(w => w.status === 'in-progress');
      if (wf && wf.config && wf.config['$field'] != null && wf.config['$field'] !== '') {
        process.stdout.write(String(wf.config['$field']));
      }
    " 2>/dev/null)
  fi
  # Legacy fallback: pre-v0.50.0 workflows stored config in index.json.
  # Use grep -E for portability (BSD grep on macOS doesn't support -P).
  if [ -z "$value" ]; then
    value=$(grep -Eo "\"$field\":[[:space:]]*\"[^\"]+\"" .stelow/*/*/index.json 2>/dev/null \
      | sed -E 's/.*"([^"]+)"$/\1/' | head -1)
  fi
  echo "${value:-$default}"
}

# Public: read appetite from active workflow (default: Core)
stelow_read_appetite() {
  stelow_config appetite "Core"
}

# Public: read review_mode from active workflow (default: Product Spec + Interface + Scopes)
stelow_read_review_mode() {
  stelow_config review_mode "Product Spec + Interface + Scopes"
}

# Public: read domains_detected as JSON array (default: [])
stelow_read_domains() {
  local v=""
  if [ -f "stelow.json" ]; then
    v=$(node -e "
      const t = JSON.parse(require('fs').readFileSync('stelow.json','utf8'));
      const wf = t.workflows.find(w => w.status === 'in-progress');
      process.stdout.write(wf && wf.config && Array.isArray(wf.config.domains_detected)
        ? JSON.stringify(wf.config.domains_detected) : '[]');
    " 2>/dev/null)
  fi
  echo "${v:-[]}"
}