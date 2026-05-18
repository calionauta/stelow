---
name: cali-shape-up
description: >
  [Cali] Shape Up product planning skill. Use when the user wants to shape
  a product proposal using the Shape Up method. Produces a shaped proposal
  with problem, solution, scope (IN/OUT), and risks. Part of the
  cali-product-workflow but can be used standalone.
---

# Shape Up Planning

## Overview

This skill executes the Shape Up planning phase. It can be run:
1. **Standalone:** `/skill:cali-shape-up` — for quick shaping sessions
2. **Via Orchestrator:** Called by `/skill:cali-product-workflow`

## 1a. Parallel Recon (optional — recommended for complex features)

Before shaping, launch `subagent` to map context:

```typescript
subagent({
  tasks: [
    {
      agent: "scout",
      task: `Map the current code state related to: [description].
Identify relevant files, existing flows, and impact points.`,
      output: ".cali-product-workflow/{YYYY-MM-DD}/{_dir}/context/current-state.md",
      context: "fresh"
    },
    {
      agent: "scout",
      task: `Map technical risks, external dependencies, and
constraints for: [description].`,
      output: ".cali-product-workflow/{YYYY-MM-DD}/{_dir}/context/risks.md",
      context: "fresh"
    }
  ],
  concurrency: 2
})
```

Read the outputs before proceeding.

## 1b. Shaping

Read the `references/` files to guide the process:

| File | Covers |
|---|---|
| `references/SHAPING-COMPLETE.md` | Context, clarification, responsibilities |
| `references/SHAPING-PRINCIPLES.md` | Core shaping principles |
| `references/RISK-ANALYSIS.md` | Risk analysis and strategic alternatives |
| `references/EXECUTION-GUIDE.md` | Sequencing, persistence, cross-domain adaptation |
| `references/proposal-structure.md` | Output structure for the shaped proposal |
| `references/output-expectations.md` | Strong vs weak output criteria |

Use `ask_user_question` for strategic questions when needed.

After shaping:
- Save to `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md`
- Do not ask about Interface Brainstorming — already decided in Phase 1 (Setup)

## 1c. Scope Adjustment (after Shape Up)

Show the IN/OUT scope table. Ask:

1. **Remove IN scopes?** — `ask_user_question` multiSelect with current scopes
2. **Include OUT scopes?** — `ask_user_question` multiSelect with out-of-scope items

If user selects nothing → proceed with original Shape Up.
If there are removals/inclusions → create `spec-product_{v+1}.md` with adjusted scopes and document what changed.

## Output

The shaped proposal is saved to:
```
.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md
```

See `references/proposal-structure.md` for the expected output format.

## Related Skills

- **cali-product-workflow**: Coordinates this skill with other phases
- **cali-interface-brainstorm**: Interface exploration after shaping
- **cali-plan-critique**: Plan review after shaping

## Environment Adaptation

If a tool is unavailable, check:
`../cali-product-workflow/references/environment-adaptation.md`