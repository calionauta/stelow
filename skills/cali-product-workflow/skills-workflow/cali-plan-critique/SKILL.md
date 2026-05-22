---
name: cali-plan-critique
description: >
  [Cali] Plan critique skill using audit checklists and frameworks. Reviews
  spec-product.md for gaps, risks, and improvements. Part of cali-product-workflow
  but can be used standalone after Shape Up.

  Trigger keywords: plan critique, review spec, identify gaps, pre-flight check,
  critical questions, audit checklist

  NOT for: implementation, execution (use cali-product-scope-executor instead)
---

# Plan Critique

## Goal

Review a shaped proposal (spec-product.md) using comprehensive audit checklists to identify gaps, risks, and improvements before execution.

## When to Use

Activate when:
- User wants to critique a shaped proposal
- Pre-flight check before execution
- Identifying gaps in product planning
- Plan review phase of cali-product-workflow

**Do NOT activate for:**
- Direct implementation
- Debugging existing code
- Quick questions

## Process

### 5a. Read Reference Files

Read the `references/` files to guide the process:

| File | Covers | When to read |
|---|---|---|
| `references/plan-critique-context.md` | Role definition, when to use, workflow position | **Before starting** — sets reviewer role |
| `references/checklists.md` | Flow, state, affordance, data, system, feasibility checks | **During analysis** — primary checklist |
| `references/critique-frameworks.md` | Nielsen heuristics, emotional journey, cognitive load, personas, AI slop | **During analysis** — UX evaluation frameworks |
| `references/audit-dimensions.md` | 5 audit dimensions (a11y, perf, theming, responsive, anti-patterns) | **During analysis** — technical audit framework |
| `references/auto-resolve-rules.md` | Rules for automatic gap resolution | **After analysis** — for auto-resolve mode |
| `references/output-format.md` | Critique report format | **After analysis** — format output |

### 5b. Analysis via Subagent

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

## Output Format

This skill produces:
- **critique-report_{v}.md** — Critique report with categorized findings
- **spec-product_{v+1}.md** — Updated spec with resolved gaps (if resolution occurred)

Critique report format:
- **Executive Summary** — High-level overview
- **🚨 Critical Questions** — Must resolve before execution
- **🤔 Important** — Should address before execution
- **🔎 Minor** — Optional improvements
- **Strengths** — What's working well

## Gotchas

1. **Do NOT resolve gaps** — Only identify and classify, unless auto-resolve is selected
2. **Gap severity** — 🚨 must be resolved before execution; 🤔 should be; 🔎 optional
3. **Auto-resolve rules** — If selected, rules from auto-resolve-rules.md apply
4. **Versioning** — If gaps are resolved, create spec-product_{v+1}.md
5. **After critique** — Proceed to Plannotator Gate automatically

## Testing

### Trigger Tests
- "Review this spec" → should trigger
- "Critique the product plan" → should trigger
- "Identify gaps" → should trigger
- "Fix the auth bug" → should NOT trigger

### Output Tests
- Critique contains 🚨, 🤔, 🔎 categories
- Critical questions are specific and actionable
- Auto-resolve creates new spec version if gaps resolved

## Related Skills

- **cali-shape-up**: Produces the spec-product.md that feeds this critique
- **cali-tech-planning**: Executes after critique approval
- **cali-product-workflow**: Coordinates this skill with other phases

## Environment Adaptation

If a tool is unavailable, check:
`../../../cali-product-workflow/references/cli-tools/`