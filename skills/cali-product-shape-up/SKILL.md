---
name: cali-product-shape-up
description: >
  [Cali] Shape Up product planning skill. Use when the user wants to shape
  a product proposal using the Shape Up method. Produces a shaped proposal
  with problem, solution, scope (IN/OUT), and risks. Part of the
  cali-product-workflow but can be used standalone.
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
- Save to `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md`

### Output Validation Guard

After saving, validate the shaped proposal has all required sections:

```bash
SPEC=".cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md"
VALID=true


grep -q "IN scope" "$SPEC" || { echo "VALIDATION_FAILED: missing IN scope"; VALID=false; }
grep -q "OUT scope" "$SPEC" || { echo "VALIDATION_FAILED: missing OUT scope"; VALID=false; }
grep -q -E "## (Risks|Rabbit ?holes)" "$SPEC" || { echo "VALIDATION_FAILED: missing Risks section"; VALID=false; }

if [ "$VALID" = false ]; then
  echo "One or more required sections missing. Regenerating spec with missing sections flagged..."
  # Feed validation errors back to the shaping process and regenerate once
  # (subagent or inline, depending on how the spec was generated)
  # After regeneration, re-run this validation. If still failing, flag for user review.
fi
```

> **Rationale:** (No Appetite validation — Shape Up's appetite is implicit in
> the proposal context, not a separate section.) Missing IN/OUT boundaries and
> Risks are the most common LLM hallucination in shaping. Catching them at save
> time prevents wasted Critique and Gate cycles.

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

1. **Remove from IN?** — use the ask tool with multiSelect (see `references/cli-tools/ask.md`) with current IN scopes
2. **Add to IN?** — use the ask tool with multiSelect (see `references/cli-tools/ask.md`) with OUT scope items

[Use the ask tool — see `references/cli-tools/ask.md`]

**If user removes items:** update spec
**If user adds items:** create `spec-product_{v+1}.md` (user is aware)
**If user selects nothing:** proceed without changes

**Note:** No Plannotator re-run — ask tool already confirms selections.

## Output

The shaped proposal is saved to:
```
.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md
```

See `references/proposal-structure.md` for the expected output format.

## Related Skills

- **cali-product-workflow**: Coordinates this skill with other phases
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