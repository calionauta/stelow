## shape:12 — Tech Preview (appetite-gated)

After recon, run a lightweight tech preview to surface constraints and
opportunities BEFORE shaping the product spec. This feeds codebase reality
into the product decision, not after.

**Standalone awareness:** when running inside stelow, this step reads appetite
from `stelow.json#workflows[].config.appetite`. When standalone, defaults to Core appetite.
Cymbal runs if available + brownfield regardless of mode — it doesn't need
stelow context. Both paths produce valid output.

**Read appetite + stack source:**
```bash
WF_DIR="$(ls -td .stelow/*/*/ 2>/dev/null | head -1)"
APPETITE="Core"
if [ -n "$WF_DIR" ]; then
  STELOW_MODE=true
  # Canonical: source helper from orchestrator references (single source of truth).
  # See skills/stelow-workflow-orchestrator/references/cli-tools/read-config.md.
  # shellcheck disable=SC1091
  source "$(dirname "${BASH_SOURCE[0]:-$0}")/../../stelow-workflow-orchestrator/references/cli-tools/read-config.sh"
  APPETITE=$(stelow_read_appetite)
else
  STELOW_MODE=false
fi

STACK_SOURCE="new"
if [ -f "go.mod" ] || [ -f "package.json" ] || [ -f "Cargo.toml" ] || [ -f "Gemfile" ] || [ -f "pyproject.toml" ] || [ -f "CMakeLists.txt" ]; then
  STACK_SOURCE="existing"
fi
```

### Tech preview depth by appetite

Tech preview informs shape-up; appetite adds depth but never removes the floor. Even Lean gets a minimum tech context — appetite controls how much recon runs, not whether constraints are surfaced.

| Appetite | Brownfield? | Tech preview |
|----------|-------------|-------------|
| **Lean** | existing | **Minimum tech preview.** `cymbal structure` — entry points, central packages. Just enough to know what exists. |
| **Lean** | new | **Skip cymbal.** No codebase to analyze; product spec goes direct. |
| **Core** | existing | **Standard tech preview.** `cymbal structure` — entry points, hotspots, central packages. Quick overview. |
| **Core** | new | **Skip cymbal.** No codebase to analyze. |
| **Complete** | existing | **Deep tech preview.** `cymbal structure` + `cymbal impact` on key domain files — blast radius, coupling, risks. |
| **Complete** | new | **Skip cymbal.** No codebase to analyze. |

**Rationale:** Skipping tech preview entirely on Lean brownfield creates the same Estimation Bias trap as cutting quality — the LLM then shapes a product spec without knowing what already exists, leading to redundant scope or missed constraints. Appetite cuts scope (lines per spec, number of alternatives explored), not tech context.

### Run cymbal (if available)

```bash
if command -v cymbal &>/dev/null; then
  echo "CYMBAL_AVAILABLE"
fi
```

If cymbal is available AND appetite ≥ Core AND brownfield:

```bash
# Ensure index is fresh (safe to run multiple times — incremental)
cymbal index 2>/dev/null

# cymbal requires a git repo — stelow always runs in one
cymbal structure --json 2>/dev/null > context/cymbal-structure.json

# If Complete, also run impact on key files
if [ "$APPETITE" = "Complete" ]; then
  # Find key entry points
  EP=$(cymbal structure 2>/dev/null | grep "Entry points:" -A5 | grep "function main\|func main" | head -3)
  echo "$EP" | while read -r line; do
    FILE=$(echo "$line" | grep -oP '[^\s]+\/[^\s]+\.[a-z]+' | head -1)
    [ -n "$FILE" ] && cymbal impact "$FILE" 2>/dev/null >> context/cymbal-impact.md
  done
fi

# Search existing features by workflow name/topic
# Runs on any appetite (depth = search only, no refs/impact)
# Finds existing features that could conflict or be reused
WF_NAME=$(node -e "
  const t = JSON.parse(require('fs').readFileSync('stelow.json','utf8'));
  const wf = t.workflows.find(w => w.status === 'in-progress');
  process.stdout.write(wf ? wf.name : '');
" 2>/dev/null)
if [ -n "$WF_NAME" ]; then
  for keyword in $WF_NAME; do
    [ ${#keyword} -gt 3 ] && cymbal search --text "$keyword" 2>/dev/null | head -10 >> context/existing-features.md
  done
fi
```

### Output

Consolidate into `context/tech-preview.md`:

```markdown
# Tech Preview

## Codebase Overview
- Entry points: ...
- Hotspots: ...
- Key packages: ...

## Constraints & Opportunities
- [Constraint] Existing auth pattern must be preserved
- [Opportunity] Codebase already has event bus — can use for X
- [Risk] High coupling in module Y

## Tech Highlights (for product)
- Current stack enables: [...]
- Current stack limits: [...]
```

This feeds into `shape:20 — Shaping` as context. The product spec benefits from
knowing what the codebase already does, what it enables, and what it constrains.

### Cymbal not available? Fallback

If cymbal is not installed:
- Brownfield: use `find` + `wc -l` for basic size analysis, `git log --oneline` for activity.
- Greenfield: skip tech preview entirely.
- Consider installing cymbal for future sessions (see `references/cli-tools/cymbal.md`).
