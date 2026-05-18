---
name: cali-interface-brainstorm
description: >
  [Cali] Interface brainstorming skill. Use when generating interface proposals
  using the 5 archetypes method. Produces 5 independent proposals + hybrid recommendation.
  Part of cali-product-workflow but can be used standalone.
---

# Interface Brainstorming

## Overview

This skill executes the Interface Brainstorming phase. It can be run:
1. **Standalone:** `/skill:cali-interface-brainstorm` — for quick interface exploration
2. **Via Orchestrator:** Called by `/skill:cali-product-workflow`

## Process

Read the `references/` files to guide the process:

| File | Covers | When to read |
|---|---|---|
| `references/INTERFACE-CONTEXT.md` | Progressive Clarification, when to use, system equivalents | **Before starting** — sets behavioral rules |
| `references/INTERFACE-RECONSTRUCTION.md` | Context reconstruction, hidden job extraction | **Before generating** — prepare context |
| `references/INTERFACE-RULES.md` | Separation Rule, Forced Trade-Off Rule, output quality | **Before generating** — core generation rules |
| `references/archetypes.md` | 5 archetypes with descriptions | **During generation** — guide each proposal |
| `references/INTERFACE-EVALUATION.md` | Evaluation criteria, post-selection integration | **After generating** — evaluate proposals |
| `references/output-format.md` | Output format specification | **After generating** — format output |
| `references/hybrid-recommendation.md` | Hybrid recommendation strategy | **After evaluation** — create final recommendation |

## Generate Proposals

**Generate each proposal individually in parallel** (5 independent workers):

```typescript
subagent({
  tasks: [
    { agent: "worker", task: `Generate Proposal A (Archetype A — [description from references/archetypes.md]) for [product context]. Markdown output in full proposal format with ASCII wireframes, breadboarding and trade-offs.` },
    { agent: "worker", task: `Generate Proposal B (Archetype B — [archetype description]) for [product context]. Full format.` },
    { agent: "worker", task: `Generate Proposal C (Archetype C — [archetype description]) for [product context]. Full format.` },
    { agent: "worker", task: `Generate Proposal D (Archetype D — [archetype description]) for [product context]. Full format.` },
    { agent: "worker", task: `Generate Proposal E + Hybrid (Archetype E — [archetype description]) for [product context]. Include hybrid recommendation combining strong elements from multiple archetypes. Full format.` },
  ],
  concurrency: 5,
  context: "fork"
})
```

- Each worker generates **one** proposal (independent, no cross-contamination)
- Combined output: `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/interfaces/interfaces_{v}.md`
- **Do not ask for input** — generate everything at once

## Visual Review

After generating the 5 proposals, submit to Plannotator for visualization:

```bash
plannotator annotate .cali-product-workflow/{YYYY-MM-DD}/{_dir}/interfaces/interfaces_{v}.md
```

## User Selection

After visual review, ask the user which proposal to follow:

```typescript
ask_user_question({
  questions: [{
    question: `Which interface direction to follow?
Recommendation: Hybrid (combination of each proposal's strengths).
Justification: [1-2 sentences].`,
    header: "Interface",
    options: [
      {
        label: "H — Hybrid (Recommended)",
        description: "Combination of the best elements from multiple proposals."
      },
      {
        label: "A — Proposal A",
        description: "Archetype A ({archetype name}) — {summary}"
      },
      {
        label: "B — Proposal B",
        description: "Archetype B ({archetype name}) — {summary}"
      },
      {
        label: "C — Proposal C",
        description: "Archetype C ({archetype name}) — {summary}"
      },
      {
        label: "D — Proposal D",
        description: "Archetype D ({archetype name}) — {summary}"
      },
      {
        label: "E — Proposal E",
        description: "Archetype E ({archetype name}) — {summary}"
      }
    ]
  }]
})
```

After selection, create `spec-product_{v+1}.md` incorporating the chosen interface (ASCII sketches).

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
`../cali-product-workflow/references/environment-adaptation.md`