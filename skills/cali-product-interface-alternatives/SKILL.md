---
name: cali-product-interface-alternatives
description: >
  [Cali] Interface alternatives exploration skill. Use when generating interface
  proposals using the 5-archetype library. Produces 1, 3, or 5 proposals depending
  on appetite, plus hybrid recommendation for Core/Complete. Part of stelow but can
  be used standalone.
metadata:
  frequency: monthly
  category: product
  context-cost: low
---

# Interface Alternatives

> **Tools:** See `references/cli-tools/subagents.md` for subagent patterns.

## Overview

This skill executes the Interface Alternatives phase.

## How to Load

### Via Orchestrator (recommended)
The orchestrator reads this file directly when needed.

### Standalone
This skill works standalone. Use the Input Detection section below to tell the skill what interface you want to brainstorm. Follow the instructions inline.

**Standalone awareness:** when inside stelow, reads appetite from `.stelow/*/spec-product.md`. When standalone, defaults to Core appetite (3 interfaces + hybrid). If the spec-product.md is not in the expected path, pass it explicitly or let the LLM scan for `spec-product*.md` in the current directory.

## Process

**Step 0: Read appetite from `spec-product.md` and choose interface exploration depth.**

Appetite controls how many interface alternatives are explored. Quality is not cut; the number of explored alternatives is.

| Appetite | Interface exploration |
|----------|----------------------|
| `Lean` | 1 suggested interface only. No alternative exploration. |
| `Core` | 3 archetypes explored + 1 hybrid recommendation. |
| `Complete` | 5 archetypes explored + 1 hybrid recommendation. |

```bash
APPETITE=$(grep -oP '^appetite:\s*\K\S+' .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "Core")

case "$APPETITE" in
  Lean)
    INTERFACE_COUNT=1
    ARCHETYPES="A" # Choose the archetype that best fits the work pattern.
    HYBRID="skip"
    ;;
  Core)
    INTERFACE_COUNT=3
    ARCHETYPES="A,D,E" # Safe baseline + simplicity + expert flow; replace one with B/C if better justified.
    HYBRID="yes"
    ;;
  Complete)
    INTERFACE_COUNT=5
    ARCHETYPES="A,B,C,D,E"
    HYBRID="yes"
    ;;
  *)
    echo "APPETITE_UNKNOWN: '$APPETITE'. Defaulting to Core interface exploration."
    INTERFACE_COUNT=3
    ARCHETYPES="A,D,E"
    HYBRID="yes"
    ;;
esac
```

**Step 1:** Read the `references/` files to guide the process:

| File | Covers | When to read |
|---|---|---|
| `references/interface-context.md` | Progressive Clarification, when to use, system equivalents | **Before starting** |
| `references/interface-reconstruction.md` | Context reconstruction, hidden job extraction | **Before generating** |
| `references/interface-rules.md` | Separation Rule, Work-Pattern-First Composition, Smell Self-Audit, State Coverage Baseline, Forced Trade-Off Rule, output quality | **Before generating** |
| `references/archetypes.md` | 5 archetypes with descriptions | **During generation** |
| `references/hybrid-recommendation.md` | Hybrid recommendation strategy | **Step 3 only** |

## Generate Proposals (Step 1-2)

Use the subagents tool (see `references/cli-tools/subagents.md`) to generate the appetite-selected proposals in parallel. For `Lean`, run one worker only. For `Core`, run 3 workers. For `Complete`, run 5 workers.

```
$INTERFACE_COUNT parallel workers (fork context):
  Generate only the selected archetype(s) from $ARCHETYPES

⚠️ CRITICAL — Before generating, each worker MUST read:
  1. references/interface-rules.md — Work-Pattern-First Composition (mandatory Section 0)
  2. references/interface-rules.md — Smell Self-Audit (mandatory Section 6)
  3. references/interface-rules.md — State Coverage Baseline (mandatory Section 7)
  4. references/output-format.md — full output format with all 8 sections

Each outputs to .stelow/{date}/{dir}/interfaces/proposal-{letter}.md
```

- Each worker generates **one** proposal (independent, no cross-contamination)
- Each proposal **must** include Work Pattern Declaration (Section 0), Design Smell Audit (Section 6), and State Coverage Table (Section 7)
- Combined output: `.stelow/{YYYY-MM-DD}/{_dir}/interfaces/interfaces_{v}.md`


**Step 2:** see `references/output-format.md` for instructions to format and concatenate selected proposals.


## Generate Hybrid (Step 3 — AFTER proposals complete)


**CRITICAL:** Hybrid is generated only when `$HYBRID = yes` (Core or Complete appetite) and **AFTER** all selected proposals are complete to avoid bias.

Use the subagents tool (see `references/cli-tools/subagents.md`) to merge:

```
Agent: worker
Task: Generate Hybrid Proposal
Reads: selected proposal files
Output: Append to interfaces.md per hybrid-recommendation.md
```
```


## Visual Review (Interface Gate — Automatic)

**After all selected proposals (+ Hybrid when applicable), use the Plannotator gate command** (see `references/cli-tools/plannotator.md` for the correct CLI command). Execute it directly — do NOT describe it to the user.

Wait for the `--gate` result. If approved, **automatically advance to Interface Selection** — use **Pattern 2** from `references/cli-tools/structured-question.md` to let the user pick one proposal. Do NOT just describe what comes next — execute it.

## User Selection (Interface Selection)

After visual review and approval, use **Pattern 2** from `references/cli-tools/structured-question.md` to ask the user which proposal to follow.

## Output

Interface proposals are saved to:
```
.stelow/{YYYY-MM-DD}/{_dir}/interfaces/interfaces_{v}.md
```

## Related Skills

- **cali-product-shape-up**: Produces the shaped proposal that feeds this phase
- **stelow** (orchestrator): Coordinates this skill with other phases

## Input Detection (Standalone Mode)

When called outside the workflow with no pre-existing spec-product.md:

```
Input:
  ├── User provided a spec-product*.md path?
  │   └→ Read its IN/OUT scope and solution description
  ├── User described the feature verbally?
  │   └→ Extract: what does the user need to accomplish?
  └── No structured input?
      └→ Ask: "What interface do you want to explore? Describe
         what the user needs to do, and any constraints (platform,
         existing UI patterns, brand guidelines)."
```

Then follow the appetite-selected archetype generation process above.

## Environment Adaptation

If a tool is unavailable, check:
`references/cli-tools/`