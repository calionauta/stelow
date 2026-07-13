---
name: stelow-product-codebase-critique
description: >
  [Cali] Structural critique for codebases. Accepts a directory of source code and
  evaluates architecture, data flow, API contracts, performance, theming, responsive
  patterns, and AI slop in code — then generates a classified gap report.
  Part of stelow (pre-implementation codebase review) but usable standalone.
  For codebases with visual UI, use stelow-product-ux-critique instead.
metadata:
  frequency: weekly
  category: code
  context-cost: medium
---

# Codebase Critique

> **Focus:** Critically analyze source code structure — architecture,
> data flow, API contracts, performance, theming, responsive patterns, and AI slop in code.
> **Input:** Source code directory.
> **Output:** Classified gap report (🚨/🤔/🔎) with recommendations.

> **Tools:** See `references/cli-tools/subagents.md` for subagent patterns.

**Standalone awareness:** inside stelow, appetite gates critique depth (Lean → light, Core → quick, Complete → full). Standalone defaults to Core appetite (quick single-reviewer). Works with any source directory — no stelow dependency for the audit logic.

## Overview

Structural codebase critique — evaluates architecture, data flow, API contracts, performance,
theming, responsive patterns, and AI slop in code.

This skill performs a source code audit using checklists focused on
technical and structural aspects (non-visual):

| Dimension | What it evaluates |
|----------|-------------|
| 🏗️ **Architecture** | Module structure, dependency flow, coupling |
| 🔄 **Data Flow** | Call chains, state management, event propagation |
| 📡 **System Contracts** | API definitions, error handling, logging |
| ⚡ **Performance** | Bundle size, re-renders, lazy loading |
| 🎨 **Theming** | Design tokens, dark mode support |
| 📱 **Responsive** | CSS breakpoints, media queries |
| 🤖 **AI Slop in Code** | Over-generated patterns, redundant code, boilerplate |

**Important:** This skill is for analyzing source code of components and logic.
If you need visual UI auditing (accessibility, design, UX), use
`stelow-product-ux-critique` em Codebase mode.

### Appetite Gate (auto-skip for small scopes)

**Before running codebase critique**, check if appetite warrants it.
Codebase critique is for structural analysis — if the scope is 1 file,
the value is minimal.

```bash
# Read appetite from stelow context or env var; default Core
WF_DIR="$(ls -td .stelow/*/*/ 2>/dev/null | head -1)"
APPETITE="${APPETITE:-Core}"
if [ -n "$WF_DIR" ] && [ -f "${WF_DIR}index.json" ]; then
  APPETITE=$(grep -oP '"appetite":\s*"([^"]+)"' "${WF_DIR}index.json" 2>/dev/null | grep -oP '"([^"]+)"$' | tr -d '"' )
fi
DIFF_FILES=$(git diff --name-only HEAD~1 2>/dev/null | wc -l | tr -d ' ')
```

| Appetite | Files changed | Action |
|----------|--------------|--------|
| `Lean` | any | **Light.** Single reviewer runs a basic structural check (architecture, dead code, naming). Quality floor. |
| `Core` | 1-2 | **Light.** Single reviewer with standard checklist. |
| `Core` | 3+ | **Quick critique.** Single reviewer, no parallel. |
| `Complete` | any | **Full.** One reviewer analyzes all dimensions with detailed recommendations, or parallel reviewers when scope warrants. |

**Rationale:** Codebase critique is quality protection — appetite controls depth, not whether it runs. At Lean the reviewer uses a lighter checklist (basic structural, dead code, naming) instead of architectural analysis, but the audit always runs. Code review is correctness; codebase critique is structure — they're complementary, not substitutes.

### Standalone
```
I received a code directory and want to review the architecture.
```

### Via stelow-product-scope-executor
When a technical scope is executed and needs code review.

### Via stelow (Stage Verification)

Use this skill when the workflow needs a structural codebase audit beyond the
normal fresh-context code review. The default `code-review` step launches a
fresh reviewer; use this skill when architecture, data flow, API contracts,
performance, theming, responsive patterns, or AI slop need deeper analysis.

---

## 🔀 Input Detection

```
Input received:
  ├── Is it a source code directory (no visual UI)?
  │   └→ ✅ Mode: Codebase Critique
  ├── Is it a directory containing visual components?
  │   └→ Use stelow-product-ux-critique (Codebase mode) — also covers architecture
  ├── User described the code/architecture verbally?
  │   └→ Use description as context anchor. Try to find matching
  │      source directories in the current workspace. If none found,
  │      run a lightweight critique based on the description.
  └── No structured input given?
      └→ Ask: "What codebase do you want to critique? Provide a directory
         path or describe the architecture/component."
```

---

## How to Run

### 1. Discover structure

```bash
find {INPUT_PATH} -maxdepth 3 -type f \( -name "*.templ" -o -name "*.go" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.css" -o -name "*.html" \) | head -50
```

### 2. Read reference files

| File | Covers |
|------|--------|
| `references/codebase-audit-dimensions.md` | Architecture, Data Flow, System, Performance, Theming, Responsive, AI Slop |
| `references/auto-resolve-rules.md` | Rules for auto-resolving gaps with defaults |
| `references/output-format.md` | Report format |

### 3. Run critique via subagent

Use the subagents tool (see `references/cli-tools/subagents.md`) to critique the codebase:

```
Agent: reviewer
Task: Critique codebase (Codebase mode)
Reads: references/*.md
Input: {INPUT_PATH}
```
- codebase-audit-dimensions.md: Run ALL dimensions systematically:
  1. Architecture — module structure, dependency direction, coupling, abstraction layers
  2. Data Flow — call chains, state management (global vs local), event propagation
  3. System Contracts — API interfaces, error handling (typed vs untyped), logging patterns
  4. Performance — bundle size indicators, re-render triggers, lazy loading, memoization
  5. Theming — design tokens (CSS vars vs hardcoded values), dark mode coverage
  6. Responsive — media queries, breakpoint strategy, container queries
  7. AI Slop in Code — over-generated code, duplicate patterns, dead code, unnecessary
     abstraction, large identical blocks (>15 lines repeated)

For each issue: severity (P0/P1/P2/P3), what was observed, which dimension flagged it,
  actionable recommendation. Note if issue is structural (hard to fix) or cosmetic (easy fix).

Output per output-format.md.
Save to .stelow-codebase-critique/critique-report.md.

### 4. Gap Resolution

| Severity | Action |
|------------|------|
| **P0 — Blocking** | Fix immediately (e.g., security, data loss) |
| **P1 — Major** | Fix before release |
| **P2 — Minor** | Next cycle |
| **P3 — Polish** | If time permits |

---

## Output

```
.stelow-codebase-critique/
  critique-report.md     ← gap report
```

---

## Integration with Other Skills

### stelow-product-scope-executor

When a technical scope is executed, the executor can delegate code verification
to this skill.

### stelow (Stage Verification)

The default `code-review` step launches a fresh-context reviewer. Use this skill
when the workflow needs a deeper structural audit of non-visual code, or when
the normal review finds architecture/data-flow/performance concerns that need
specialized analysis.

---

## Related Skills

- **stelow-product-ux-critique**: For visual/interface critique (use instead when you have UI)
- **stelow-product-plan-critique**: For product plan critique (use instead when you have spec-product.md)
- **stelow-product-execution-critique**: Post-implementation audit
