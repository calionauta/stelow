---
name: cali-product-plan-critique
description: >
  [Cali] Plan critique skill using audit checklists and frameworks. Reviews
  spec-product.md for gaps, risks, and improvements. Part of cali-product-workflow
  but can be used standalone after Shape Up.
---

# Plan Critique

> **Tools:** See `references/cli-tools/subagents.md` for subagent patterns.

This skill executes the Plan Critique phase.

## How to Load

This skill is **bundled with cali-product-workflow** — there is no standalone `/skill:` command.

### Via Orchestrator (recommended)
The orchestrator reads this file directly when needed.

### Standalone
To run standalone, read `cali-product-plan-critique/SKILL.md` and follow the instructions inline.

## Process

### 5a. Read reference files

Read the `references/` files to guide the process:

| File | Covers | When to read |
|---|---|---|
| `references/plan-critique-context.md` | Role definition, when to use, workflow position | **Before starting** — sets reviewer role |
| `references/checklists.md` | Flow, state, affordance, data, system, feasibility checks | **During analysis** — primary checklist |
| `references/critique-frameworks.md` | Nielsen heuristics, emotional journey, cognitive load, personas, AI slop | **During analysis** — UX evaluation frameworks |
| `references/audit-dimensions.md` | 5 audit dimensions (a11y, perf, theming, responsive, anti-patterns) | **During analysis** — technical audit framework |
| `references/auto-resolve-rules.md` | Rules for automatic gap resolution | **After analysis** — for auto-resolve mode |
| `references/output-format.md` | Critique report format | **After analysis** — format output |

### 5b. Analysis via subagent

Launch subagent with checklists from `references/`:

```typescript
subagent({
  agent: "reviewer",
  task: `Review the spec-product.md using checklists from references/.
Use: plan-critique-context.md (role), checklists.md (primary), critique-frameworks.md (UX), audit-dimensions.md (technical).
Output: Executive Summary + Critical Questions (🚨) + Important (🤔) + Minor (🔎) + Strengths.
Do NOT resolve gaps — only identify and classify.
Format per output-format.md.
Save to .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/critique-report.md`,
  output: ".cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/critique-report.md"
})
```

### 5c. Gap Resolution

Ask mode: **Auto-resolve** (applies rules from `references/auto-resolve-rules.md`) or **Manual** (ask one by one).

- 🔎 is always automatic
- Auto-resolve: save `spec-product_{v}-pre-critique.md`, create `spec-product_{v+1}.md` with
  "Resolved Gaps" section, and show change summary before proceeding
- Manual: ask each 🚨 and 🤔 individually
- After resolving, create `spec-product_{v+1}.md` with documented resolutions

## Output

Critique report is saved to:
```
.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/critique-report.md
```

Updated spec (after gap resolution):
```
.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v+1}.md
```

## Related Skills

- **cali-product-shape-up**: Produces the spec-product.md that feeds this critique
- **cali-product-tech-planning**: Executes after critique approval
- **cali-product-workflow**: Coordinates this skill with other phases

## Environment Adaptation

If a tool is unavailable, check:
`../cali-product-workflow/references/cli-tools/`