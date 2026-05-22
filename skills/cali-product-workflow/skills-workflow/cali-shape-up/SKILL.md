---
name: cali-shape-up
description: >
  [Cali] Shape Up product planning skill. Use when the user wants to shape
  a product proposal using the Shape Up method. Produces a shaped proposal
  with problem, solution, scope (IN/OUT), and risks. Part of the
  cali-product-workflow but can be used standalone.

  Trigger keywords: shape up, shape a proposal, product planning, scope IN OUT,
  shaped proposal, appetite, rabbit hole, bet

  NOT for: execution, implementation, coding (use cali-product-scope-executor instead)
---

# Shape Up Planning

## Goal

Transform a raw product idea into a shaped proposal with:
- **Problem** — what problem does this solve?
- **Solution** — how do we solve it?
- **Scope (IN/OUT)** — what's in and what's out?
- **Risks** — what could go wrong?

## When to Use

Activate when:
- User wants to shape a product proposal
- Creating a spec-product.md for a new feature
- Planning a feature with clear boundaries
- Estimating appetite and scope before execution

**Do NOT activate for:**
- Direct implementation (use cali-product-scope-executor)
- Debugging existing code
- Quick questions

## Process

### 1a. Parallel Recon (optional — recommended for complex features)

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

### 1b. Shaping

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

1. **Remove from IN?** — use the ask tool with multiSelect (see `references/cli-tools/ask.md`) with current IN scopes
2. **Add to IN?** — use the ask tool with multiSelect (see `references/cli-tools/ask.md`) with OUT scope items

[Use the ask tool — see `references/cli-tools/ask.md`]

**If user removes items:** update spec
**If user adds items:** create `spec-product_{v+1}.md` (user is aware)
**If user selects nothing:** proceed without changes

**Note:** No Plannotator re-run — ask tool already confirms selections.

## Output Format

This skill produces:
- **spec-product_{v}.md** — Shaped proposal with problem, solution, IN/OUT scope, risks

See `references/proposal-structure.md` for the expected output format.

The file must contain:
- **Appetite** — how much time/effort (e.g., "3 slices")
- **Problem** — what problem does this solve?
- **Solution** — how do we solve it?
- **IN scope** — what's included
- **OUT scope** — what's explicitly excluded
- **Rabbit holes** — risky areas to watch
- **Risks** — what could go wrong

## Gotchas

1. **Scope adjustment timing** — After Gate approval, not immediately after shaping
2. **No Interface question** — Already handled in Setup phase, don't ask again
3. **Parallel recon value** — For complex features, recon catches missed dependencies
4. **IN/OUT balance** — IN must fit within appetite; OUT must be explicit
5. **No bet table here** — Betting table is part of cali-product-workflow orchestrator

## Testing

### Trigger Tests
- "Shape up this feature" → should trigger
- "Create a shaped proposal for login" → should trigger
- "Debug the auth flow" → should NOT trigger

### Output Tests
- spec-product.md contains problem/solution/IN/OUT
- Appetite is stated (e.g., "3 slices")
- OUT scope is explicit (not just "and other things")
- Risks are documented

## Related Skills

- **cali-product-workflow**: Coordinates this skill with other phases
- **cali-interface-brainstorm**: Interface exploration after shaping
- **cali-plan-critique**: Plan review after shaping

## Environment Adaptation

If a tool is unavailable, check:
`../../../cali-product-workflow/references/cli-tools/`