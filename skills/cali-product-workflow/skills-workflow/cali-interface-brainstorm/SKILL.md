---
name: cali-interface-brainstorm
description: >
  [Cali] Interface brainstorming skill. Use when generating interface proposals
  using the 5 archetypes method. Produces 5 independent proposals + hybrid recommendation.
  Part of cali-product-workflow but can be used standalone.

  Trigger keywords: interface brainstorming, 5 archetypes, proposal A B C D E,
  wireframe, UI design, hybrid proposal, interface proposals

  NOT for: technical planning (use cali-tech-planning instead)
---

# Interface Brainstorming

## Goal

Generate 5 interface proposals using different archetypes, then create a hybrid recommendation combining the strongest elements.

## When to Use

Activate when:
- User wants interface exploration
- Need to choose an interface direction
- Creating UI proposals for a feature
- Interface Brainstorming phase is triggered by orchestrator

**Do NOT activate for:**
- Technical planning (use cali-tech-planning)
- Direct implementation
- Debugging existing code

## Process

### Step 1: Read Reference Files

Read the `references/` files to guide the process:

| File | Covers | When to read |
|---|---|---|
| `references/interface-context.md` | Progressive Clarification, when to use, system equivalents | **Before starting** |
| `references/interface-reconstruction.md` | Context reconstruction, hidden job extraction | **Before generating** |
| `references/interface-rules.md` | Separation Rule, Forced Trade-Off Rule, output quality | **Before generating** |
| `references/archetypes.md` | 5 archetypes with descriptions | **During generation** |
| `references/hybrid-recommendation.md` | Hybrid recommendation strategy | **Step 3 only** |

### Step 2: Generate 5 Proposals (Parallel)

Generate 5 proposals in parallel (5 independent workers):

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

### Step 3: Read Output Format

Read `references/output-format.md` to format and concatenate all proposals.

### Step 4: Generate Hybrid (AFTER proposals complete)

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

## Output Format

This skill produces:
- **interfaces_{v}.md** — 5 proposals (A-E) + Hybrid recommendation

Each proposal must contain:
- **Archetype name** — which archetype this represents
- **ASCII wireframe** — visual representation
- **Key characteristics** — what makes this unique
- **Trade-offs** — strengths and risks

## Gotchas

1. **Hybrid timing** — Generate AFTER all 5 proposals complete, not before
2. **Parallel independence** — Each proposal is independent (no cross-contamination)
3. **No bias** — Hybrid must only reference existing proposals, not preemptively favor one
4. **Visual review** — After all proposals + Hybrid, use Plannotator gate automatically
5. **Selection pattern** — After gate approval, use Pattern 2 from ask-patterns.md for user selection

## Testing

### Trigger Tests
- "Generate interface proposals" → should trigger
- "Brainstorm 5 UI approaches" → should trigger
- "Create wireframes" → should trigger
- "Fix the auth bug" → should NOT trigger

### Output Tests
- interfaces.md contains 5 proposals + 1 hybrid
- Each proposal has ASCII wireframe
- Hybrid references elements from multiple proposals
- All proposals are independent (no duplication)

## Related Skills

- **cali-shape-up**: Produces the shaped proposal that feeds this phase
- **cali-product-workflow**: Coordinates this skill with other phases
- **cali-tech-planning**: Executes after interface selection

## Environment Adaptation

If a tool is unavailable, check:
`../../../cali-product-workflow/references/cli-tools/`