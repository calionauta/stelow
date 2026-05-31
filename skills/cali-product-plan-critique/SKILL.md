---
name: cali-product-plan-critique
description: >
  [Cali] Systematic gap analysis for product plans. Accepts a spec-product.md file and
  evaluates flows, states, affordances, data handling, system contracts, and feasibility
  — then generates a classified gap report with actionable questions.
  Part of cali-product-workflow (`critique` stage) but usable standalone.
metadata:
  frequency: weekly
  category: product
  context-cost: medium
---

# Plan Critique

> **Focus:** Critically analyze a product plan (`spec-product.md`) to find
> ambiguities, gaps, risks, and missing definitions before implementation.
> **Input:** `spec-product.md` (single file).
> **Output:** Classified gap report (🚨/🤔/🔎) with actionable questions.

> **Tools:** See `references/cli-tools/subagents.md` for subagent patterns.

## Overview

Systematic gap analysis for product plans — finds ambiguities, risks, and missing definitions
before implementation. Every finding becomes a specific, actionable question.

## Checklists

This skill runs 6 specialized checklists against product plans:

| Checklist | What it evaluates |
|-----------|-------------|
| 🌀 **Flows** | Main flow, alternative, error, rollback, synchronization |
| 🎯 **States** | Empty, loading, partial, error, boundary, edge |
| 👆 **Affordances** | Hover/focus/disabled states, touch targets, keyboard nav |
| 📊 **Data** | Validation, defaults, null handling, persistence |
| 🔧 **System** | API contracts, timeouts, retry, fallback, offline |
| ⚖️ **Feasibility** | Architecture, stack, security, effort estimation |

**Golden rule:** Every gap becomes a **specific, actionable question** —
never a vague criticism. The goal is to unblock the implementation team, not delay them.

## Activation

### Standalone
```
Received a spec-product.md and want to review before implementation.
```

### Via cali-product-workflow (`critique` stage)
The workflow loads this skill automatically after Tech Planning, before Plannotator.

### Via cali-product-tech-planning
Before generating technical scopes, tech-planning calls this skill to ensure
the plan is solid.

---

## 🔀 Input Detection

```
Input received:
  ├── Is it spec-product*.md?
  │   └→ ✅ Mode: Plan Critique
  └── Is it another file type?
      └→ ❌ Wrong input — use cali-product-codebase-critique or cali-product-ux-critique
```

---

## Como Executar

### 1. Read the plan

Read the full `spec-product.md` to understand the proposal scope, appetite, IN/OUT boundaries,
and implementation constraints.

### 2. Read reference files

| File | Covers |
|------|--------|
| `references/plan-critique-context.md` | Role, when to use, workflow position, output expectations |
| `references/checklists.md` | 6 checklists (flows, states, affordances, data, system, feasibility) |
| `references/auto-resolve-rules.md` | Rules for auto-resolving gaps with defaults |
| `references/output-format.md` | Report format specification |

### critique:20 — Appetite Violation Check

**Before launching parallel reviewers**, check the appetite from spec-product.md frontmatter:

```bash
APPETITE=$(grep -oP '^appetite:\s*\K\S+' "$INPUT" 2>/dev/null || echo "Focused")
COMPLEXITY=$(grep -oP '^complexity_estimate:\s*\K\S+' "$INPUT" 2>/dev/null || echo "$APPETITE")
```

**Note:** Auto-skip of critique is now controlled by **Mode** (from `index.json`), not by appetite. When the orchestrator calls plan-critique, mode has already decided whether critique runs. When standalone, plan-critique always runs in Full mode.

**Check for appetite violation:**

```bash
# complexity_estimate uses XS/S/M/L/XL scale, appetite uses PoC/Focused/Comprehensive
# They are different scales — cannot compare by ordinal.
# Instead, check if the estimate suggests more effort than the appetite implies:
#   - PoC: complexity must be XS or S (≤5 scopes)
#   - Focused: complexity must be M or less (≤10 scopes)
#   - Comprehensive: any complexity fits
case "$APPETITE" in
  PoC)
    case "$COMPLEXITY" in
      M|L|XL) echo "APPETITE_VIOLATION: PoC appetite but complexity=$COMPLEXITY — scope too large for declared review attention." ;;
      *) echo "APPETITE_FITS: PoC + $COMPLEXITY — OK." ;;
    esac
    ;;
  Focused)
    case "$COMPLEXITY" in
      L|XL) echo "APPETITE_VIOLATION: Focused appetite but complexity=$COMPLEXITY — consider splitting scope." ;;
      *) echo "APPETITE_FITS: Focused + $COMPLEXITY — OK." ;;
    esac
    ;;
  Comprehensive)
    echo "APPETITE_FITS: Comprehensive + $COMPLEXITY — always OK (no upper bound on depth)."
    ;;
esac
```

### critique:30 — Run parallel subagents (4 dimensions)

Instead of a single reviewer running all 6 checklists, launch 4 parallel reviewers
using the subagents tool (see `references/cli-tools/subagents.md`),
each evaluating a different dimension of the same spec-product.md with fresh context.

```
Launch 4 parallel reviewers:
  A: Flows + States → critiques/critique-flows-states.md
  B: Data + System   → critiques/critique-data-system.md
  C: Affordances + UX → critiques/critique-affordances-ux.md
  D: Feasibility      → critiques/critique-feasibility.md

Each reads checklists.md from references/, outputs per output-format.md,
and auto-resolves clear defaults per auto-resolve-rules.md.
```

> **Error recovery:** If any parallel subagent fails, retry once per the
> retry pattern in `references/cli-tools/subagents.md`. If it fails again,
> log as SKIPPED and proceed with remaining dimensions. A missing dimension
> is better than a deadlocked workflow.

### critique:40 — Consolidate critique reports

After all 4 parallel reviews complete, run a consolidation step using the
subagents tool (see `references/cli-tools/subagents.md`) that merges them
into a single unified report:

```
Agent: worker
Task: Consolidate critique reports
Read: critiques/critique-{flows-states,data-system,affordances-ux,feasibility}.md
Output: critiques/critique-report.md (per output-format.md)
```
- Apply gap classification per table below

Output: a single critique-report.md ready for the Review Gate.
Save to .cali-product-workflow/{YYYY-MM-DD}/{_dir}/critiques/critique-report.md`,
  reads: [
    "critiques/critique-flows-states.md",
    "critiques/critique-data-system.md",
    "critiques/critique-affordances-ux.md",
    "critiques/critique-feasibility.md"
  ],
  output: ".cali-product-workflow/{YYYY-MM-DD}/{_dir}/critiques/critique-report.md"
})
```

### 4. Gap Classification

| Tag | Severity | Action |
|-----|----------|--------|
| 🚨 **Critical** | Blocking — missing essential definition | Must resolve before gate |
| 🤔 **Important** | Significant gap or risk | Should resolve before gate |
| 🔎 **Minor** | Polish or nice-to-have | Note for execution |

### 5. Resolve Mode

**Auto mode (default):** For each gap, check `auto-resolve-rules.md`. If the gap has
a clear best-practice default, apply it automatically and mark "resolved by default."
Only flag genuinely ambiguous gaps as unresolved.

---

## Output

```
.cali-product-workflow/{YYYY-MM-DD}/{_dir}/critiques/
  critique-flows-states.md     ← parallel reviewer 1
  critique-data-system.md      ← parallel reviewer 2
  critique-affordances-ux.md   ← parallel reviewer 3
  critique-feasibility.md      ← parallel reviewer 4
  critique-report.md           ← consolidated (single unified report)
```}

---

## Integration with other skills

### cali-product-workflow (`critique` stage)

```
critique: Critique Gate
  └── cali-product-plan-critique (input: spec-product.md)
       ├── 6 checklists → gap report
       └── Auto-resolve → updated spec-product.md
```

### cali-product-tech-planning

Before generating scopes, tech-planning can invoke this skill to verify
the plan is sufficiently solid.

### cali-product-shape-up

After shape-up produces the spec-product, this skill does a critical review before
proceeding to tech planning.

---

## Related Skills

- **cali-product-ux-critique**: For visual/interface critique (use instead when you have a URL, codebase, or screenshot)
- **cali-product-codebase-critique**: For codebase architecture critique (use instead when you have a code directory)
- **cali-product-execution-critique**: Post-implementation audit (runs after execution to verify completeness)
