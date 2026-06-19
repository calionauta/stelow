---
name: cali-product-plan-critique
description: >
  [Cali] Systematic gap analysis for product plans. Accepts a spec-product.md file and
  evaluates flows, states, affordances+design quality, data handling, system contracts,
  compositional quality (purpose-layout alignment), and feasibility
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

This skill runs 7 specialized checklists against product plans:

| Checklist | What it evaluates |
|-----------|-------------|
| 🌀 **Flows** | Main flow, alternative, error, rollback, synchronization |
| 🎯 **States** | Data states (empty, loading, partial, error, boundary, edge) + **interaction states** (idle, hover, active, focus, disabled, loading, empty, error, overflow) |
| 👆 **Affordances + Design Quality** | Hover/focus/disabled states, touch targets, keyboard nav; **anti-pattern audit** (10 design smells) |
| 📊 **Data** | Validation, defaults, null handling, persistence |
| 🔧 **System** | API contracts, timeouts, retry, fallback, offline |
| 📐 **Compositional Quality** | Work-pattern alignment, purpose-layout match, density strategy |
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
| `references/checklists.md` | 7 checklists (flows, states+interaction states, affordances+design quality, data, system, compositional quality, feasibility) |
| `references/auto-resolve-rules.md` | Rules for auto-resolving gaps with defaults |
| `references/output-format.md` | Report format specification |

### critique:20 — Appetite Fit Check

**Before launching parallel reviewers**, check the `appetite_fit` from spec-product.md frontmatter:

```bash
APPETITE=$(grep -oP '^appetite:\s*\K\S+' "$INPUT" 2>/dev/null || echo "Focused")
FIT=$(grep -oP '^appetite_fit:\s*\K\S+' "$INPUT" 2>/dev/null || echo "fits")
```

**Note:** Auto-skip of critique is now controlled by **Mode** (from `index.json`), not by appetite. When the orchestrator calls plan-critique, mode has already decided whether critique runs. When standalone, plan-critique always runs in Full mode.

**Check appetite fit (constraint check, not estimation):**

```bash
# appetite_fit is the LLM's assessment of whether the shaped proposal
# fits within the human-declared appetite (constraint).
# Appetite is NOT a target — it's a budget. The LLM does not estimate effort.
# It checks: does this shaped design fit the declared investment?
case "$FIT" in
  fits)
    echo "APPETITE_FITS: Shaped proposal fits within $APPETITE appetite. Proceed."
    ;;
  cuts_needed)
    echo "APPETITE_CUTS_NEEDED: $APPETITE appetite but proposal needs cuts."
    echo "Critique will highlight which parts should be cut. Human decides final scope."
    ;;
  reshape)
    echo "APPETITE_RESHAPE_NEEDED: Proposal fundamentally exceeds $APPETITE appetite."
    echo "Critique cannot proceed — must reshape before continuing."
    exit 1
    ;;
  *)
    echo "APPETITE_FIT_UNKNOWN: '$FIT' invalid. Defaulting to 'fits'."
    ;;
esac
```

### critique:30 — Run parallel subagents (5 dimensions)

Instead of a single reviewer running all 7 checklists, launch 5 parallel reviewers
using the subagents tool (see `references/cli-tools/subagents.md`),
each evaluating a different dimension of the same spec-product.md with fresh context.

```
Launch 5 parallel reviewers:
  A: Flows + States → critiques/critique-flows-states.md
  B: Data + System   → critiques/critique-data-system.md
  C: Affordances + UX + Design Quality → critiques/critique-affordances-ux.md
  D: Compositional Quality (Purpose-Layout Alignment) → critiques/critique-composition.md
  E: Feasibility      → critiques/critique-feasibility.md

Each reads checklists.md from references/, outputs per output-format.md,
and auto-resolves clear defaults per auto-resolve-rules.md.
```

> **Error recovery:** If any parallel subagent fails, retry once per the
> retry pattern in `references/cli-tools/subagents.md`. If it fails again,
> log as SKIPPED and proceed with remaining dimensions. A missing dimension
> is better than a deadlocked workflow.

### critique:40 — Consolidate critique reports

After all 5 parallel reviews complete, run a consolidation step using the
subagents tool (see `references/cli-tools/subagents.md`) that merges them
into a single unified report:

```
Agent: worker
Task: Consolidate critique reports
Read: critiques/critique-{flows-states,data-system,affordances-ux,composition,feasibility}.md
Output: critiques/critique-report.md (per output-format.md)
```
- Apply gap classification per table below

Output: a single critique-report.md ready for the Review Gate.
Save to .cali-product-workflow/{YYYY-MM-DD}/{_dir}/critiques/critique-report.md`,
  reads: [
    "critiques/critique-flows-states.md",
    "critiques/critique-data-system.md",
    "critiques/critique-affordances-ux.md",
    "critiques/critique-composition.md",
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

### 5. Resolve Gaps by Mode

The plan-critique reads the workflow `mode` from `.cali-product-workflow/*/*/index.json`
to determine how classified gaps are handled. The mode controls interaction with the user,
not which checklists run — all 7 checklists run regardless of mode.

```bash
MODE=$(grep -oP '"mode":\s*"([^"]+)"' .cali-product-workflow/*/*/index.json 2>/dev/null |
  head -1 | grep -oP '"([^"]+)"$' | tr -d '""' || echo "Full Product")
```

**If `$MODE` is `Auto` or `Light`:**

All gaps (🚨 Critical, 🤔 Important, 🔎 Minor) are auto-resolved.
For each gap, check `references/auto-resolve-rules.md`.
If the gap has a clear best-practice default, apply it automatically
and mark "resolved by default."
Only flag genuinely ambiguous gaps as unresolved — these are noted
in the audit section but do NOT block the gate.

**If `$MODE` is `Moderate`:**

- 🔎 Minor gaps → auto-resolved (same as Auto)
- 🤔 Important gaps → batched into a single multiSelect question.
  Each option shows the AI's recommended resolution marked as "(Recommended)."
  User can accept or override per gap.
- 🚨 Critical gaps → batched into a single multiSelect question.
  Each option shows the AI's recommended resolution marked as "(Recommended)."
  User can accept or override per gap.

> **Implementation:** Use `ask_user_question` with multiSelect for the batch.
> One question for 🤔 gaps, one for 🚨 gaps (2 questions max).
> The user selects which recommendations to accept; anything unselected
> stays for the LLM to re-resolve with user feedback.

**If `$MODE` is `Full Product` or `Full Product + Tech`:**

- 🔎 Minor gaps → auto-resolved
- 🤔 Important gaps → batched into a single multiSelect question
  with AI recommendations marked as "(Recommended)"
- 🚨 Critical gaps → presented one-by-one. Each critical gap becomes
  its own question with AI recommendation as the first option
  labeled "(Recommended)"

**Mode not found in index.json (standalone usage):**
When plan-critique runs standalone (not via workflow), default to
`Full Product` behavior — auto-resolve minor, present moderate/critical to user.

---

## Output

```
.cali-product-workflow/{YYYY-MM-DD}/{_dir}/critiques/
  critique-flows-states.md     ← parallel reviewer 1
  critique-data-system.md      ← parallel reviewer 2
  critique-affordances-ux.md   ← parallel reviewer 3
  critique-composition.md      ← parallel reviewer 4 (design quality + work-pattern alignment)
  critique-feasibility.md      ← parallel reviewer 5
  critique-report.md           ← consolidated (single unified report)
```}

---

## Integration with other skills

### cali-product-workflow (`critique` stage)

```
critique: Critique Gate
  └── cali-product-plan-critique (input: spec-product.md)
       ├── 7 checklists (flows, states+interaction states, affordances+design quality, data, system, compositional quality, feasibility) → gap report
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
