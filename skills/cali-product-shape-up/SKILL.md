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

Read the outputs before proceeding.

## shape:15 — Assumption Check

**Before shaping**, surface assumptions that could materially change direction.
This catches generic requests ("jogo de descoberta", "saas de psicologo")
before assumptions get baked into a full spec.

**Read mode:**
```bash
WF_DIR="$(ls -td .stelow/*/*/ 2>/dev/null | head -1)"
MODE="Full Product"
[ -n "$WF_DIR" ] && MODE=$(grep -oP '"mode":\s*"([^"]+)"' "${WF_DIR}index.json" 2>/dev/null | grep -oP '"([^"]+)"$' | tr -d '"' )
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

| Mode | Behavior |
|------|----------|
| **Auto/Light** | Auto-resolve. AI fills assumptions in spec as notes. No questions. |
| **Moderate** | Top-3 most critical assumptions. Each presented with AI recommendation.
  Use `ask_user_question` (see `references/cli-tools/structured-question.md`).
  Option format: "{assumption}. Recom: {resolution}" with "(Recommended)" marker. |
| **Full/Full+Tech** | Top-5 assumptions. User responds to each.
  AI recommendation marked as "(Recommended)". |

After resolving, note in spec frontmatter:
```yaml
assumptions_resolved:
  - core_flow: confirmed (user reports bug, not describes)
  - target_user: devs
```

## shape:20 — Shaping

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
> **Appetite é constraint, não estimativa:**
> - `appetite` — definido pelo **humano** no setup stage. Quanto investimento esse problema merece? (orçamento, não estimativa)
> - `appetite_fit` — checagem mecânica inicial no Shape Up, validada pelo Plan Critique (feasibility reviewer fresh-context) pós-shaping. O proposal cabe dentro do appetite declarado?
>
> **Se `appetite_fit = cuts_needed`:** a LLM sugere cortes específicos. O humano decide quais aceitar.
> **Se `appetite_fit = reshape`:** o proposal não cabe de forma alguma — precisa ser remodelado.
> A LLM **nunca** pode estender appetite. Appetite é fixo para o ciclo.
>
> **How to define appetite:** see `references/proposal-structure.md` — Lean / Core / Complete with depth of scope. Mode controls gates/questions independently (stored in `index.json`).

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