---
name: cali-product-shape-up
description: >
  [Cali] Shape Up product planning skill. Use when the user wants to shape
  a product proposal using the Shape Up method. Produces a shaped proposal
  with problem, solution, scope (IN/OUT), and risks. Part of the
  stelow but can be used standalone.
metadata:
  frequency: weekly
  category: product
  context-cost: low
---

# Shape Up Planning

> **Tools:** See `references/cli-tools/subagents.md` for subagent patterns.

## Overview

This skill executes the Shape Up planning phase.

## How to Load

### Via Orchestrator (recommended)
The orchestrator reads this file directly when needed.

### Standalone
This skill works standalone. Use the Input Detection section below to tell the skill what you want to shape. Follow the instructions inline.

## shape:10 — Parallel Recon (optional)

Before shaping, launch `subagent` to map context:

Use the subagents tool (see `references/cli-tools/subagents.md`) in parallel for optional recon:

```
2 parallel scouts (fresh context):
1. Map current code state → context/current-state.md
2. Map technical risks → context/risks.md
```

**Check for reshape context** (from planning:15 Alignment Check):
```bash
BC="context/blocking-constraints.md"
if [ -f "$BC" ]; then
  echo "RESHAPE_CONTEXT_FOUND"
  cat "$BC"
fi
```
If blocking constraints exist from a previous tech planning cycle, read them BEFORE shaping — the new proposal must address these constraints. After reading, remove the file to prevent stale context in future cycles.

Read the outputs before proceeding.

## shape:12 — Tech Preview (appetite-gated)

After recon, run a lightweight tech preview to surface constraints and
opportunities BEFORE shaping the product spec. This feeds codebase reality
into the product decision, not after.

**Standalone awareness:** when running inside stelow, this step reads appetite
from `.stelow/*/index.json`. When standalone, defaults to Core appetite.
Cymbal runs if available + brownfield regardless of mode — it doesn't need
stelow context. Both paths produce valid output.

**Read appetite + stack source:**
```bash
WF_DIR="$(ls -td .stelow/*/*/ 2>/dev/null | head -1)"
APPETITE="Core"
if [ -n "$WF_DIR" ] && [ -f "${WF_DIR}index.json" ]; then
  APPETITE=$(grep -oP '"appetite":\s*"([^"]+)"' "${WF_DIR}index.json" 2>/dev/null | grep -oP '"([^"]+)"$' | tr -d '"' )
  STELOW_MODE=true
else
  STELOW_MODE=false
fi

STACK_SOURCE="new"
if [ -f "go.mod" ] || [ -f "package.json" ] || [ -f "Cargo.toml" ] || [ -f "Gemfile" ] || [ -f "pyproject.toml" ] || [ -f "CMakeLists.txt" ]; then
  STACK_SOURCE="existing"
fi
```

### Tech preview depth by appetite

| Appetite | Brownfield? | Tech preview |
|----------|-------------|-------------|
| **Lean** | any | **Skip.** No tech preview. Product spec goes direct — appetite says minimal scope. |
| **Core** | existing | **cymbal structure** — entry points, hotspots, central packages. Quick overview. |
| **Core** | new | **Skip** (no codebase to analyze). |
| **Complete** | existing | **cymbal structure + cymbal impact on key domain files** — blast radius, coupling, risks. |
| **Complete** | new | **Skip** (no codebase to analyze). |

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
WF_NAME=$(grep -oP '"name":\s*"([^"]+)"' .stelow/*/*/index.json 2>/dev/null | head -1 | grep -oP '"[^"]+"$' | tr -d '"')
if [ -n "$WF_NAME" ] && [ "$WF_NAME" != "null" ]; then
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

## shape:15 — Assumption Check

**Before shaping**, surface assumptions that could materially change direction.
This catches generic requests ("jogo de descoberta", "saas de psicologo")
before assumptions get baked into a full spec.

**Read mode:**
```bash
WF_DIR="$(ls -td .stelow/*/*/ 2>/dev/null | head -1)"
REVIEW_MODE="All Above + Scopes In/Out"
[ -n "$WF_DIR" ] && REVIEW_MODE=$(grep -oP '"review_mode":\s*"([^"]+)"' "${WF_DIR}index.json" 2>/dev/null | grep -oP '"([^"]+)"$' | tr -d '"' )
```

**Generate assumption list internally** — check these categories:

| Category | What to check |
|----------|---------------|
| 🎯 **Core flow** | Main flow? Trigger? Who acts? |
| 🧑 **Target user** | B2B/B2C? Size? Role? |
| 💰 **Business rules** | Payment? Multi-tenancy? Invites? |
| ⚠️ **Risk domain** | Regulatory? Sensitive data? Compliance? |
| 🛠️ **Tech hints** (light) | Mobile/web/API? (final decision in tech planning) |

**Apply mode:**

| Review Mode | Behavior |
|-------------|----------|
| **Auto/Only Product Spec** | Auto-resolve. AI fills assumptions in spec as notes. No questions. |
| **Product Spec + Interface Choice** | Top-3 most critical assumptions. Each presented with AI recommendation.
  Use `ask_user_question` (see `references/cli-tools/structured-question.md`).
  Option format: "{assumption}. Recom: {resolution}" with "(Recommended)" marker. |
| **All Above + Scopes In/Out / All Above + Tech Review** | Top-5 assumptions. User responds to each.
  AI recommendation marked as "(Recommended)". |

After resolving, note in spec frontmatter:
```yaml
assumptions_resolved:
  - core_flow: confirmed (user reports bug, not describes)
  - target_user: devs
```

## shape:20 — Shaping

**Read tech preview output + existing features (if available):**
```bash
TP="context/tech-preview.md"
[ -f "$TP" ] && echo "TECH_PREVIEW_FOUND" && cat "$TP"

EF="context/existing-features.md"
[ -f "$EF" ] && echo "EXISTING_FEATURES_FOUND" && cat "$EF"
```
If tech preview exists, it contains codebase constraints and opportunities that should inform shaping.
If existing features found, they show similar code already in the codebase — avoid duplicating or conflicting. Incorporate relevant findings into the proposal — especially risks and constraints that affect the IN/OUT scope.

Read the `references/` files to guide the process:

| File | Covers |
|---|---|
| `references/shaping-complete.md` | Context, clarification, responsibilities |
| `references/shaping-principles.md` | Core shaping principles |
| `references/risk-analysis.md` | Risk analysis and strategic alternatives |
| `references/execution-guide.md` | Sequencing, persistence, cross-domain adaptation |
| `references/proposal-structure.md` | Output structure for the shaped proposal |
| `references/output-expectations.md` | Strong vs weak output criteria |

Use the ask tool (see `references/cli-tools/structured-question.md`) for strategic questions when needed.

After shaping:
- Save to `.stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md`

### Product-Level DoD and Acceptance Criteria

Each shaped proposal should include **product-level DoD and ACs** that define what "done"
means from the user's perspective. These are distinct from technical DoD/ACs (added during
Tech Planning) — they describe the **outcome**, not the implementation.

Include in `spec-product.md`:

```
## Definition of Done (Product)

- [ ] Users can complete the core flow end-to-end
- [ ] Error states are handled and visible to the user
- [ ] Analytics events fire for key actions
- [ ] Works on mobile and desktop

## Acceptance Criteria

1. [Given/When/Then format]
2. ...
```

### Output Validation Guard

After saving, validate the shaped proposal has all required sections:

```bash
SPEC=".stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md"
VALID=true


grep -q "IN scope" "$SPEC" || { echo "VALIDATION_FAILED: missing IN scope"; VALID=false; }
grep -q "OUT scope" "$SPEC" || { echo "VALIDATION_FAILED: missing OUT scope"; VALID=false; }
grep -q "appetite:" "$SPEC" || { echo "VALIDATION_FAILED: missing appetite field (human-set)"; VALID=false; }
grep -q "appetite_fit:" "$SPEC" || { echo "VALIDATION_FAILED: missing appetite_fit field (LLM-set: does shaped proposal fit appetite?)"; VALID=false; }
grep -q -E "## (Risks|Rabbit ?holes)" "$SPEC" || { echo "VALIDATION_FAILED: missing Risks section"; VALID=false; }
grep -q "Definition of Done" "$SPEC" || { echo "VALIDATION_FAILED: missing Definition of Done section"; VALID=false; }
grep -q "Acceptance Criteria" "$SPEC" || { echo "VALIDATION_FAILED: missing Acceptance Criteria section"; VALID=false; }

if [ "$VALID" = false ]; then
  echo "One or more required sections missing. Regenerating spec with missing sections flagged..."
  # Feed validation errors back to the shaping process and regenerate once
  # (subagent or inline, depending on how the spec was generated)
  # After regeneration, re-run this validation. If still failing, flag for user review.
fi
```

### appetite_fit — Preliminary Mechanical Check

After the validation guard above, run a quick mechanical check on scope size:

```bash
SCOPE_COUNT=$(grep -c '^### ' "$SPEC")
SPEC_LINES=$(wc -l < "$SPEC")

case "$APPETITE" in
  Lean)
    [ "$SCOPE_COUNT" -gt 2 ] && echo "APPETITE_WARN: Lean appetite but $SCOPE_COUNT scopes (>2). Consider consolidating."
    [ "$SPEC_LINES" -gt 150 ] && echo "APPETITE_WARN: Lean spec >150 lines. Consider trimming."
    ;;
  Core)
    [ "$SCOPE_COUNT" -gt 5 ] && echo "APPETITE_WARN: Core appetite but $SCOPE_COUNT scopes (>5). Consider reducing."
    [ "$SPEC_LINES" -gt 350 ] && echo "APPETITE_WARN: Core spec >350 lines. Consider tightening."
    ;;
  Complete)
    # No mechanical limits for Complete — appetite_fit evaluated by Plan Critique
    ;;
esac
```

If warnings fire, flag them in the output but do NOT block — the **Plan Critique** stage validates `appetite_fit` via its fresh-context feasibility reviewer (see `cali-product-plan-critique` checklists). The critique's gap resolution (mode-dependent) handles `cuts_needed` and `reshape`. This aligns `appetite_fit` with the existing evaluation infrastructure instead of adding a dedicated subagent.

The `appetite_fit` field in the spec frontmatter is the **human-readable summary**; the Plan Critique validates it.
>
> **Appetite is constraint, not estimate:**
> - `appetite` — set by the **human** during setup. How much investment does this problem deserve? (budget, not estimate)
> - `appetite_fit` — initial mechanical check in Shape Up, validated by Plan Critique (feasibility reviewer fresh-context) post-shaping. Does the proposal fit within the declared appetite?
>
> **If `appetite_fit = cuts_needed`:** the LLM suggests specific cuts. The human decides which to accept.
> **If `appetite_fit = reshape`:** the proposal fundamentally exceeds appetite — must be reshaped before continuing.
> The LLM **never** extends appetite. Appetite is fixed for the cycle.
>
> **How to define appetite:** see `references/proposal-structure.md` — Lean / Core / Complete with depth of scope. Mode controls gates/questions independently (stored in `index.json`).

---

### ⚡ Estimation Bias Correction (global criterion)

The mechanical warnings above (scope count, spec lines) are **indicators**, not gates.
Language models are trained on human data, and humans systematically
**overestimate** implementation time. This makes the model tend to:

- Recommend unnecessary scope cuts (`cuts_needed` false positive)
- Prefer "cheap" or low-quality solutions out of fear of complexity
- Interpret "delivery realism" as permission to cut quality

**Correction rules:**
1. Scope count warnings are **informational** — do not cut scope based on them.
   The model's bias overestimates complexity, producing false positives.
2. The question is not "does this plan fit the appetite?" but rather
   "is the plan well-defined?" — a well-defined plan with 4 Lean scopes
   is not a violation.
3. `cuts_needed` must be based on **value overlap**, not on
   "too many scopes for the available time".
4. If the model feels "this seems too complex", it should **distrust
   its own bias** and justify why it thinks cuts are needed
   — without assuming it is correct.
5. The final decision on cuts is always **human**. The model suggests cuts,
   but must present both scenarios (with and without cuts),
   explicitly stating that the estimate may be inflated.

- Do not ask about Interface Alternatives — already decided in the `setup` stage
- **Do NOT ask scope adjustment yet** — this happens after Product Critique and Gate approval (see workflow sequence below)

## Workflow Sequence

After Shape Up, the workflow proceeds:

```
Shape Up
    ↓
Product Critique (pre-flight check)
    ↓
Plannotator (Gate — visual approval)
    ↓
Scope Adjustment (ask) ← HERE scope happens
    ↓
Interface Alternatives (if selected)
```

**Note:** Scope Adjustment comes AFTER Gate approval, not before.

## Scope Adjustment (after Gate approval)

**This section executes after Plannotator Gate approval** (not immediately after shaping).

When triggered by the orchestrator:

Show the IN/OUT scope table. Ask:

1. **Remove from IN?** — use the ask tool with multiSelect (see `references/cli-tools/structured-question.md`) with current IN scopes
2. **Add to IN?** — use the ask tool with multiSelect (see `references/cli-tools/structured-question.md`) with OUT scope items

[Use the ask tool — see `references/cli-tools/structured-question.md`]

> **⚡ Estimation Bias:** When asking "Remove from IN?", the model tends to suggest
> removing items that **seem** complex, but could be simple to implement.
> If the model recommends removing something due to "complexity", it must state that
> this is an estimate and may be inflated. The final decision is human.

**If user removes items:** update spec
**If user adds items:** create `spec-product_{v+1}.md` (user is aware)
**If user selects nothing:** proceed without changes

**Note:** No Plannotator re-run — ask tool already confirms selections.

## Output

The shaped proposal is saved to:
```
.stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md
```

See `references/proposal-structure.md` for the expected output format.

## Related Skills

- **stelow**: Coordinates this skill with other phases
- **cali-product-interface-alternatives**: Interface exploration after shaping
- **cali-product-plan-critique**: Plan review after shaping

## Input Detection (Standalone Mode)

When called outside the workflow with no pre-approved spec-product.md context:

```
Input:
  ├── User provided a problem statement?
  │   └→ Use it directly as the shaping anchor
  ├── User provided a spec-product*.md path?
  │   └→ Read it and use its scope/risks as starting point
  └── No structured input given?
      └→ Ask the user:
         "What product feature or problem do you want to shape?
         Describe the desired outcome, target audience, and any constraints."
```

The skill will guide you through Parallel Recon → Shaping → Proposal output.

## Environment Adaptation

If a tool is unavailable, check:
`references/cli-tools/`