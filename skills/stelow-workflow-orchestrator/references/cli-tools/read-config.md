# Read Workflow Config (canonical snippet)

> **CLI-agnostic** — any agent with bash + node can use this. Requires `node` (built-in on most systems) and a project with `stelow.json` at the root.

**Canonical source:** `Workflow.config.{quality,supervisor,exploration_count,exploration_hybrid,review_mode,domains_detected,red_first}` lives in `stelow.json#workflows[]`. This is the single source of truth for the active workflow's config. A legacy `config.appetite` is accepted and mapped once (any value → quality production, supervisor high; breadth 2/3/5 from Lean/Core/Complete).

**Preferred form (helper available):** `scripts/stelow config get <field> [default]` — single tested parser. The sourced functions below delegate to it automatically and fall back to the inline reader on standalone installs without a helper checkout.

**Invariants:**

- `stelow.json` lives at project root — always relative to **cwd**, never to `WF_DIR`.
- A workflow is **active** when `status === "in-progress"`. Always filter for active when multiple workflows exist (e.g., 1 archived + 1 in-progress).
- Hosts that run the helper against a per-workflow state dir (`STELOW_STATEDIR`) 
  make that workflow authoritative: the helper resolves its own entry by 
  `workflowId`, then by the directory's `dirHash`, and only then falls back to 
  the active-by-status filter. Card-based hosts keep several workflows in 
  flight in one project, where the status filter alone returns whichever entry 
  happens to come first.

## Canonical helper

Source this in any skill that needs to read workflow config:

```bash
# Source the helper (adjust path relative to skill)
source "$(dirname "${BASH_SOURCE[0]}")/../../stelow-workflow-orchestrator/references/cli-tools/read-config.sh"

QUALITY=$(stelow_read_quality)
SUPERVISOR=$(stelow_read_supervisor)
EXPLORATION_COUNT=$(stelow_read_exploration_count)
EXPLORATION_HYBRID=$(stelow_read_exploration_hybrid)
REVIEW_MODE=$(stelow_read_review_mode)
DOMAINS_DETECTED=$(stelow_read_domains)
RED_FIRST=$(stelow_read_red_first)
```

Or inline (no source — copy-paste the function):

```bash
# Returns the config value from the active workflow's stelow.json#workflows[].config.
# Args: <field> [<default>]
# Example: $(stelow_config appetite Core)
stelow_config() {
  local field="$1"
  local default="${2:-}"
  if [ -f "stelow.json" ]; then
    node -e "
      const t = JSON.parse(require('fs').readFileSync('stelow.json','utf8'));
      const wf = t.workflows.find(w => w.status === 'in-progress');
      if (wf && wf.config && wf.config['$field'] != null && wf.config['$field'] !== '') {
        process.stdout.write(String(wf.config['$field']));
      }
    " 2>/dev/null
    return
  fi
  echo "$default"
}

# Convenience wrappers
stelow_read_quality() { stelow_config quality production; }
stelow_read_supervisor() { stelow_config supervisor high; }
stelow_read_exploration_count() { stelow_config exploration_count 3; }
stelow_read_exploration_hybrid() { stelow_config exploration_hybrid true; }
# Deprecated alias (one release line): stelow_read_appetite() { stelow_config appetite Core; }
stelow_read_review_mode() { stelow_config review_mode "Product Spec + Interface + Scopes"; }
# Kill-switch (single source: config.red_first; strict on production,
# advisory on experimental; STELOW_RED_FIRST env overrides stored value).
stelow_read_red_first() {
  case "${STELOW_RED_FIRST:-}" in
    strict|advisory|off) echo "$STELOW_RED_FIRST"; return ;;
  esac
  local v
  v=$(stelow_config red_first "")
  case "$v" in
    strict|advisory|off) echo "$v"; return ;;
  esac
  [ "$(stelow_config quality production)" = "experimental" ] && echo "advisory" || echo "strict"
}
stelow_read_domains() {
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
```

## Why this exists

**Before this helper** the pattern `grep -oP '"appetite":\s*"([^"]+)"' ... | grep -oP '"[^"]+"$' | tr -d '"'` was duplicated across 7+ skills with subtle variations (some used `head -1`, some didn't filter by status). Risks:

1. **Multi-workflow ambiguity** — `head -1` returns the first workflow in array order, not the active one. If user has 1 archived + 1 in-progress, the wrong config may be picked.
2. **Inconsistent regex** — 3 different regex patterns extracted the same field across files. Brittle to JSON whitespace changes.
3. **Empty-string bug** — `grep -oP '"appetite":\s*"([^"]+)"'` matches empty values; `tr -d '"'` returns `""`; `|| echo "Core"` does **not** fire because `grep` returned 0. Result: empty value used instead of fallback.

This helper fixes all three.

## Migration

Replace inline `grep` patterns with the helper. Example migration:

**Before** (shape-up/SKILL.md):
```bash
APPETITE=$(grep -oP '"appetite":\s*"([^"]+)"' stelow.json 2>/dev/null | grep -oP '"([^"]+)"$' | tr -d '"' || echo "Core")
```

**After**:
```bash
source "$(dirname "${BASH_SOURCE[0]}")/../../stelow-workflow-orchestrator/references/cli-tools/read-config.sh"
APPETITE=$(stelow_read_appetite)
```

## Fallback behavior

| Scenario | Returns |
|---|---|
| `stelow.json` exists, in-progress workflow, knob set | The value |
| `stelow.json` exists, in-progress workflow, knob undefined, legacy `config.appetite` set | Mapped value (production/high/2-3-5) |
| `stelow.json` exists, in-progress workflow, knob undefined, no legacy | empty string → caller decides |
| `stelow.json` exists, no in-progress workflow | empty string (no false positives from archived) |
| `stelow.json` missing | Default passed as 2nd arg |