#!/usr/bin/env bash
# read-config.sh — canonical helper for reading Workflow.config from stelow.json
#
# Source this in any skill that needs appetite/review_gates/domains_detected:
#   source "$(dirname "${BASH_SOURCE[0]}")/../../stelow-workflow-orchestrator/references/cli-tools/read-config.sh"
#   APPETITE=$(stelow_read_appetite)
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

# Public: read appetite from active workflow (default: Core)
stelow_read_appetite() {
  stelow_config appetite "Core"
}

# Public: read the review gate set from active workflow.
#
# Usage: stelow_read_review_gates [default]
#
# Emits a space-separated atom list ("spec tech"), which is what every caller
# branches on. It deliberately does NOT emit a ladder rung: a set like
# `interface` alone has no rung, so a reader that expected one either got Auto
# (which reads as "no gates" and refuses the tech plan) or an empty string.
# `stelow_has_review_gate <atom> [default]` is the question callers actually ask.
#
# The default is the empty set, not a rung, and that default is deliberate: a
# skill run outside stelow has declared nothing, and an assumed default that
# invents three gates would park a standalone run waiting for a human nobody
# asked. Callers that genuinely want more depth pass it as their own default.
stelow_read_review_gates() {
  local raw
  raw=$(stelow_config review_gates "")
  if [ -z "$raw" ]; then
    printf '%s' "$1"
    return
  fi
  # stelow.json stores an array; JSON.stringify's bracket form is stripped so
  # the output is a plain space-separated list either way.
  printf '%s' "$raw" | node -e "
    const raw = require('fs').readFileSync(0, 'utf8').trim();
    const list = raw.startsWith('[')
      ? JSON.parse(raw)
      : raw.replace(/^\[|\]$/g, '').split(',');
    process.stdout.write(list.map(s => String(s).trim()).filter(Boolean).join(' '));
  " 2>/dev/null || printf '%s' "$raw"
}

# Whether one atom is selected. Callers branch on this, never on the string:
# a substring test reads "tech" as present inside "tech-plan" and inside the
# word "matching", which is a gate nobody configured.
# Usage: stelow_has_review_gate <atom> [default-when-undeclared]
stelow_has_review_gate() {
  local atom="$1"
  stelow_read_review_gates "${2:-}" | tr ' ' '\n' | grep -qx "$atom"
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