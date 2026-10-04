## shape:12 — Tech Preview (breadth-gated)

After recon, run a lightweight tech preview to surface constraints and
opportunities BEFORE shaping the product spec. This feeds codebase reality
into the product decision, not after.

**Standalone awareness:** when running inside stelow, this step reads exploration breadth
from `stelow.json#workflows[].config.exploration`. When standalone, defaults to standard breadth (3).
Cymbal runs if available + brownfield regardless of mode — it doesn't need
stelow context. Both paths produce valid output.

**Read exploration breadth + stack source:**
```bash
WF_DIR="$(ls -td .stelow/*/*/ 2>/dev/null | head -1)"
EXPLORATION_COUNT="3"
if [ -n "$WF_DIR" ]; then
  STELOW_MODE=true
  # Canonical: source helper from orchestrator references (single source of truth).
  # See skills/stelow-workflow-orchestrator/references/cli-tools/read-config.md.
  # shellcheck disable=SC1091
  source "$(dirname "${BASH_SOURCE[0]:-$0}")/../../stelow-workflow-orchestrator/references/cli-tools/read-config.sh"
  EXPLORATION_COUNT=$(stelow_read_exploration_count)
else
  STELOW_MODE=false
fi

STACK_SOURCE="new"
if [ -f "go.mod" ] || [ -f "package.json" ] || [ -f "Cargo.toml" ] || [ -f "Gemfile" ] || [ -f "pyproject.toml" ] || [ -f "CMakeLists.txt" ]; then
  STACK_SOURCE="existing"
fi
```

### Tech preview depth by exploration breadth

Tech preview informs shape-up; breadth adds depth but never removes the floor. Even narrow exploration gets a minimum tech context — breadth controls how much recon runs, not whether constraints are surfaced.

| Breadth | Brownfield? | Tech preview |
|----------|-------------|-------------|
| **1–2** | existing | **Minimum tech preview.** `cymbal structure` — entry points, central packages. Just enough to know what exists. |
| **1–2** | new | **Skip cymbal.** No codebase to analyze; product spec goes direct. |
| **3** | existing | **Standard tech preview.** `cymbal structure` — entry points, hotspots, central packages. Quick overview. |
| **3** | new | **Skip cymbal.** No codebase to analyze. |
| **4–5** | existing | **Deep tech preview.** `cymbal structure` + `cymbal importers` on key domain files and `cymbal impact` on key domain symbols — blast radius, coupling, risks. |
| **4–5** | new | **Skip cymbal.** No codebase to analyze. |

**Rationale:** Skipping tech preview entirely on narrow brownfield creates the same Estimation Bias trap as cutting quality — the LLM then shapes a product spec without knowing what already exists, leading to redundant scope or missed constraints. Breadth cuts scope (number of directions explored), not tech context.

### Run the portable preflight, then cymbal when available

Start from the project workspace root, not the workflow state directory:

```bash
bash <skill-dir>/../../stelow-workflow-orchestrator/references/cli-tools/recon.sh tech-preview
```

Read `context/recon-receipt.json` before choosing a tool. It is the durable
record of the host's live capability probe and must be cited in the preview.
Do not install a missing tool inside the workflow.

```bash
if command -v cymbal &>/dev/null; then
  echo "CYMBAL_AVAILABLE"
fi
```

If cymbal is available AND exploration count ≥ 3 AND brownfield:

```bash
# Ensure index is fresh (safe to run multiple times — incremental)
cymbal index 2>/dev/null

# The preflight already verified this is the target Git workspace.
cymbal structure --json 2>/dev/null > context/cymbal-structure.json

# At breadth 4-5, also run blast-radius analysis on key files
if [ "$EXPLORATION_COUNT" -ge 4 ]; then
  # Entry points from machine-readable structure output
  jq -r '.entry_points[]?' context/cymbal-structure.json 2>/dev/null | head -3 | while read -r file; do
    [ -n "$file" ] && cymbal outline -s --names "$file" --json 2>/dev/null >> context/cymbal-outline.md
    # files -> importers, symbols -> impact (impact takes SYMBOL names, never filenames)
    [ -n "$file" ] && cymbal importers "$file" --json --no-federate 2>/dev/null >> context/cymbal-impact.md
  done
  # for known symbols: cymbal impact "<Symbol>" --json --no-federate >> context/cymbal-impact.md
fi

# Search existing features by workflow name/topic
# Runs at any breadth (depth = search only, no refs/impact)
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
- Brownfield: `sem entities --json > context/sem-entities.json` for a typed inventory; `sem log --json` for hotspots + co-changes; `sem context --budget 8000 --headers --json` to bound the preview; `ripwire --metrics --json` for size/complexity.
- Greenfield: skip tech preview entirely.
- In `context/tech-preview.md`, cite `context/recon-receipt.json` and state
  `TOOL_MISSING:cymbal`; consider installing it only after this workflow.
