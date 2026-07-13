# Read Workflow Config (canonical snippet)

> **CLI-agnostic** — any agent with bash + grep can use this. No dependencies on jq, node, or external tools.

**Canonical source as of v0.50.0:** `Workflow.config.{appetite,review_mode,domains_detected}` lives in `stelow.json#workflows[]`. `index.json` is a mirror (TS extension write-through), not the source.

**Invariants:**

- `stelow.json` lives at project root — always relative to **cwd**, never to `WF_DIR`.
- A workflow is **active** when `status === "in-progress"`. Always filter for active when multiple workflows exist (e.g., 1 archived + 1 in-progress).
- Fallback chain: `stelow.json` (canonical) → `index.json` (legacy pre-v0.50.0) → hard-coded default.

## Canonical helper

Source this in any skill that needs to read workflow config:

```bash
# Source the helper (adjust path relative to skill)
source "$(dirname "${BASH_SOURCE[0]}")/../../stelow-product-orchestrator/references/cli-tools/read-config.sh"

APPETITE=$(stelow_read_appetite)
REVIEW_MODE=$(stelow_read_review_mode)
DOMAINS_DETECTED=$(stelow_read_domains)
```

Or inline (no source — copy-paste the function):

```bash
# Returns the config value from the active workflow's stelow.json#workflows[].config.
# Args: <field> [<default>]
# Example: $(stelow_config appetite Core)
stelow_config() {
  local field="$1"
  local default="${2:-}"
  local value=""
  if [ -f "stelow.json" ]; then
    # Filter for in-progress workflows only (avoid stale archived entries)
    local active_config
    active_config=$(node -e "
      const t = JSON.parse(require('fs').readFileSync('stelow.json','utf8'));
      const wf = t.workflows.find(w => w.status === 'in-progress');
      process.stdout.write(wf && wf.config && wf.config['$field'] != null ? String(wf.config['$field']) : '');
    " 2>/dev/null)
    if [ -n "$active_config" ]; then
      echo "$active_config"
      return
    fi
    # Legacy fallback: pre-v0.50.0 workflows stored config in index.json
    local legacy_config
    legacy_config=$(grep -oP "\"$field\":\\s*\"[^\"]+\"" .stelow/*/*/index.json 2>/dev/null | grep -oP '"[^"]+"$' | tr -d '"' | head -1)
    if [ -n "$legacy_config" ]; then
      echo "$legacy_config"
      return
    fi
  fi
  echo "$default"
}

# Convenience wrappers
stelow_read_appetite() { stelow_config appetite Core; }
stelow_read_review_mode() { stelow_config review_mode "Product Spec + Interface + Scopes"; }
stelow_read_domains() {
  local v
  v=$(node -e "
    const t = JSON.parse(require('fs').readFileSync('stelow.json','utf8'));
    const wf = t.workflows.find(w => w.status === 'in-progress');
    process.stdout.write(wf && wf.config && Array.isArray(wf.config.domains_detected) ? JSON.stringify(wf.config.domains_detected) : '[]');
  " 2>/dev/null)
  echo "${v:-[]}"
}
```

## Why this exists

**Before v0.50.1** the pattern `grep -oP '"appetite":\s*"([^"]+)"' ... | grep -oP '"[^"]+"$' | tr -d '"'` was duplicated across 7+ skills with subtle variations (some used `head -1`, some didn't filter by status). Risks:

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
source "$(dirname "${BASH_SOURCE[0]}")/../../stelow-product-orchestrator/references/cli-tools/read-config.sh"
APPETITE=$(stelow_read_appetite)
```

## Fallback behavior

| Scenario | Returns |
|---|---|
| `stelow.json` exists, in-progress workflow, `config.appetite` set | The value |
| `stelow.json` exists, in-progress workflow, `config.appetite` undefined | empty string → caller decides |
| `stelow.json` exists, no in-progress workflow | empty string (no false positives from archived) |
| `stelow.json` missing, legacy `.stelow/*/*/index.json` has `config.appetite` | The legacy value |
| Nothing found | Default passed as 2nd arg |