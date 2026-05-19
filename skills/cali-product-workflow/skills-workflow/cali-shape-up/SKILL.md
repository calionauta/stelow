---
name: cali-shape-up
description: >
  [Cali] Shape Up product planning skill. Use when the user wants to shape
  a product proposal using the Shape Up method. Produces a shaped proposal
  with problem, solution, scope (IN/OUT), and risks. Part of the
  cali-product-workflow but can be used standalone.
---

# Shape Up Planning

> **Tools:** See `references/pi-tools/subagents.md` for subagent patterns.

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
- **Do NOT ask scope adjustment yet** — this happens after Plan Critique and Gate approval (see workflow sequence below)

## Workflow Sequence

After Shape Up, the workflow proceeds:

```
Shape Up
    ↓
Plan Critique (pre-flight check)
    ↓
Plannotator (Gate — visual approval)
    ↓
Scope Adjustment (ask) ← HERE scope happens
    ↓
Interface Brainstorming (if selected)
```

**Note:** Scope Adjustment comes AFTER Gate approval, not before.

## Scope Adjustment (after Gate approval)

**This section executes after Plannotator Gate approval** (not immediately after shaping).

When triggered by the orchestrator:

Show the IN/OUT scope table. Ask:

1. **Remove from IN?** — `ask_user_question` multiSelect with current IN scopes
2. **Add to IN?** — `ask_user_question` multiSelect with OUT scope items

```typescript
ask_user_question({
  questions: [
    {
      question: "What should be REMOVED from IN scope? (select none to keep current)",
      header: "Remove IN",
      multiSelect: true,
      options: [
        { label: "{IN scope item 1}", description: "{description}" },
        { label: "{IN scope item 2}", description: "{description}" }
      ]
    },
    {
      question: "What should be ADDED to IN scope? (select none to keep current)",
      header: "Add to IN",
      multiSelect: true,
      options: [
        { label: "{OUT scope item 1}", description: "{description}" },
        { label: "{OUT scope item 2}", description: "{description}" }
      ]
    }
  ]
})
```

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
- **cali-interface-brainstorm**: Interface exploration after shaping
- **cali-plan-critique**: Plan review after shaping

## Environment Adaptation

If a tool is unavailable, check:
`../../../cali-product-workflow/references/pi-tools/`