### planning:15 — Bidirectional Alignment Check (mode-gated)

**After scopes are generated and validated**, check whether the tech plan aligns
with the product spec — or reveals constraints that invalidate it. This is the
feedback loop that prevents "tech discovered too late" problems.

**Standalone awareness:** inside stelow, reads mode from `stelow.json#workflows[].config.review_mode` and specs
from `.stelow/`. When standalone, defaults to Full mode (maximum interaction)
and reads specs from current directory or prompts for paths.

**Read mode + locate specs:**
```bash
WF_DIR="$(ls -td .stelow/*/*/ 2>/dev/null | head -1)"
REVIEW_MODE="Product Spec + Interface + Scopes"
SPEC_PRODUCT=""
SPEC_TECH=""

# shellcheck disable=SC1091
source "$(dirname "${BASH_SOURCE[0]:-$0}")/../../stelow-workflow-orchestrator/references/cli-tools/read-config.sh" 2>/dev/null || true
if [ -n "$WF_DIR" ] && [ -f "stelow.json" ]; then
  REVIEW_MODE=$(stelow_read_review_mode 2>/dev/null || echo "Product Spec + Interface + Scopes")
  SPEC_PRODUCT=".stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md"
  SPEC_TECH=".stelow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_{v}.md"
  STELOW_MODE=true
else
  # Standalone: look for spec files in current dir, prompt if missing
  SPEC_PRODUCT=$(ls -t spec-product*.md 2>/dev/null | head -1)
  SPEC_TECH=$(ls -t spec-tech*.md 2>/dev/null | head -1)
  STELOW_MODE=false
fi
```

**If both SPEC_PRODUCT and SPEC_TECH are empty (standalone + no spec files found):**
Prompt the user for paths or skip the alignment check.

```
ask tool: {question: "No spec files found. Provide paths to spec-product.md and spec-tech.md, or skip alignment check?", options: [
  {label: "Skip alignment check", description: "Proceed without bidirectional validation. Tech planning output is final."},
  {label: "Provide paths", description: "Specify paths to spec-product.md and spec-tech.md for alignment check."}
]}
```

If skipped, log: `context/alignment-skipped.md` with reason.

**LLM compares spec-tech against spec-product. Classify as:**

| Classification | Meaning |
|--------------|---------|
| `aligned` | Tech plan fits product spec. No changes needed. |
| `product_needs_update` | Tech reveals constraint/opportunity that changes IN/OUT, scope, or design. Spec-product should be updated. |
| `blocking` | Tech plan contradicts product spec fundamentally. Must reshape product spec. |

**Mode-dependent behavior:**

| Mode | `aligned` | `product_needs_update` | `blocking` |
|------|-----------|----------------------|-----------|
| **Auto** | Segue | Auto-update spec-product v+1. Segue. | Auto-update spec-product v+1. Segue. |
| **Product Spec Gate** | Segue | Auto-update spec-product v+1. Log change in artifact. | Auto-update spec-product v+1. Log change in artifact. |
| **Product Spec + Interface Gates** | Segue | **Flag user** (ask tool): "Tech planning suggests updating scope. Allow?" Recom: update. | **Flag user**: "Tech plan contradicts product spec. Reshape required?" Recom: reshape. |
| **Product Spec + Interface + Scopes** | Segue | **Ask user**: show diff, let them choose update/ignore/reshape. | **Ask user**: show contradiction. Offer reshape or abort. |
| **Product Spec + Interface + Tech Review** | Segue | **Ask user** with detailed tech impact. | **Ask user** with detailed tech impact. |

**Appetite affects check depth:**

| Appetite | Check depth |
|----------|------------|
| **Lean** | Quick: only check if any IN scope is technically impossible. |
| **Core** | Standard: compare IN/OUT scopes vs feasibility. Check NFR constraints. |
| **Complete** | Deep: check each scope's ACs vs codebase reality. Include performance, security, dependencies. |

**If `product_needs_update` or `blocking` and Review Mode >= Product Spec + Interface Gates:**

Use `ask_user_question` (see `cli-tools/ask.md`):

```
ask tool: {
  question: `Tech planning reveals: ${DISCREPANCY}

Current IN: ${IN_SCOPES}
Tech constraint: ${CONSTRAINT}

What do you want to do?`,
  header: "Alignment",
  options: [
    { label: "Update product spec (Recommended)", description: "Accept tech feedback. Spec-product will be updated to v+1. The new version reflects what's feasible and valuable." },
    { label: "Ignore, proceed as-is", description: "Keep current product spec. Tech planning continues with original scope. Risk: execution may uncover same constraint." },
    { label: "Reshape required", description: "Stop tech planning. Return to shape stage with tech constraints as input for a new proposal." }
  ]
}
```

**If user chooses "Update product spec":**
1. Read CURRENT spec-product.md
2. Update IN/OUT, scope, or design notes based on tech feedback
3. Save as `spec-product_{v+1}.md`
4. Update the spec-tech frontmatter to reference the new product spec version
5. Proceed with planning:20

**If user chooses "Reshape required":**
1. Log the blocking constraint to `context/blocking-constraints.md` — this file is consumed by `shape:10` on the next cycle.
2. Save checkpoint at planning:15 with `reshape_requested: true` and `constraints_ref: context/blocking-constraints.md`.
3. Reset phase via existing command:
   ```
   /sw-setphase phasename=Shape
   ```
   This reuses the existing `/sw-setphase` mechanism — no new command needed.
   The `currentPhase` in stelow.json resets to Shape (index 4) and planning stage is reopened.
4. Inform user: "Blocking constraint saved to `context/blocking-constraints.md`. The workflow has been reset to the Shape stage. The orchestrator will now run shape:10 — it reads `blocking-constraints.md` automatically and resumes shaping with these constraints as input."

**On next shape cycle:** `shape:10` checks for `context/blocking-constraints.md` automatically. If found, constraints are read and the file is removed to prevent stale context.

**If user chooses "Ignore":**
1. Log the warning to `context/deferred-constraints.md`
2. Proceed with planning:20
3. Constraint may surface again in audit stage

