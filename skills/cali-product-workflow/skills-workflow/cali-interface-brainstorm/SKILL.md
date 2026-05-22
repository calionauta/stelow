---
name: cali-interface-brainstorm
description: >
  [Cali] Interface brainstorming skill. Use when generating interface proposals
  using the 5 archetypes method. Produces 5 independent proposals + hybrid recommendation.
  Part of cali-product-workflow but can be used standalone.
---

# Interface Brainstorming

> **Tools:** See `references/cli-tools/subagents.md` for subagent patterns.

## Overview

This skill executes the Interface Brainstorming phase. It can be run:
1. **Standalone:** `/skill:cali-interface-brainstorm` — for quick interface exploration
2. **Via Orchestrator:** Called by `/skill:cali-product-workflow`

## Process

**Step 1:** Read the `references/` files to guide the process:

| File | Covers | When to read |
|---|---|---|
| `references/interface-context.md` | Progressive Clarification, when to use, system equivalents | **Before starting** |
| `references/interface-reconstruction.md` | Context reconstruction, hidden job extraction | **Before generating** |
| `references/interface-rules.md` | Separation Rule, Forced Trade-Off Rule, output quality | **Before generating** |
| `references/archetypes.md` | 5 archetypes with descriptions | **During generation** |
| `references/hybrid-recommendation.md` | Hybrid recommendation strategy | **Step 3 only** |

## Generate Proposals (Step 1-2)

**Step 1:** Generate 5 proposals in parallel (5 independent workers):

```typescript
subagent({
  tasks: [
    { agent: "worker", task: `Generate Proposal A (Archetype A — Conventional Standard) for [product context]. Full format per references/output-format.md.` },
    { agent: "worker", task: `Generate Proposal B (Archetype B — Interaction Paradigm Shift) for [product context]. Full format per references/output-format.md.` },
    { agent: "worker", task: `Generate Proposal C (Archetype C — Technological Vanguard) for [product context]. Full format per references/output-format.md.` },
    { agent: "worker", task: `Generate Proposal D (Archetype D — Radical Simplicity) for [product context]. Full format per references/output-format.md.` },
    { agent: "worker", task: `Generate Proposal E (Archetype E — Expert/Command-First) for [product context]. Full format per references/output-format.md.` },
  ],
  concurrency: 5,
  context: "fork"
})
```

- Each worker generates **one** proposal (independent, no cross-contamination)
- Combined output: `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/interfaces/interfaces_{v}.md`


**Step 2:** Read `references/output-format.md` to format and concatenate all proposals.


## Generate Hybrid (Step 3 — AFTER proposals complete)


**CRITICAL:** Hybrid is generated **AFTER** all 5 proposals are complete to avoid bias.
**`agent` parameter is REQUIRED** — always use `"worker"`:

```typescript
subagent({
  agent: "worker",
  task: `Read the 5 proposals (A-E) from .cali-product-workflow/{YYYY-MM-DD}/{_dir}/interfaces/interfaces_{v}.md.
Then generate a **Hybrid Proposal** that combines the strongest elements from 2 or more archetypes.
Follow references/hybrid-recommendation.md for the strategy.
Append to the interfaces file.`,
  reads: [`.cali-product-workflow/{YYYY-MM-DD}/{_dir}/interfaces/interfaces_{v}.md`]
})
```


## Visual Review (Phase 8 Gate — Automatic)

**After all proposals + Hybrid, use the Plannotator gate command** (see `references/cli-tools/plannotator.md` for the correct CLI command). Execute it directly — do NOT describe it to the user.

Wait for the `--gate` result. If approved, **automatically advance to Phase 9 (Interface Selection)** — use **Pattern 2** from `references/cli-tools/structured-question.md` to let the user pick one proposal. Do NOT just describe what comes next — execute it.

## User Selection (Phase 9)


After visual review and approval, use **Pattern 2** from `../../phases/ask-patterns.md` to ask the user which proposal to follow.

## Output

Interface proposals are saved to:
```
.cali-product-workflow/{YYYY-MM-DD}/{_dir}/interfaces/interfaces_{v}.md
```

## Related Skills

- **cali-shape-up**: Produces the shaped proposal that feeds this phase
- **cali-product-workflow** (orchestrator): Coordinates this skill with other phases

## Environment Adaptation

If a tool is unavailable, check:
`../../../cali-product-workflow/references/cli-tools/`