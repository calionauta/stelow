---
name: cali-product-plan-critique
description: >
  [Cali] Systematic gap analysis for product plans. Accepts a spec-product.md file and
  evaluates flows, states, affordances+design quality, data handling, system contracts,
  compositional quality (purpose-layout alignment), and feasibility
  — then generates a classified gap report with actionable questions.
  Part of stelow (`critique` stage) but usable standalone.
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

> **Mode caveat:** In `Auto`/`Light` modes, gaps become internal recommendations in
> the report (no user questions). The "question" is posed to the spec, not the user.
> In `Moderate`/`Full` modes, top-N gaps are pushed as actual user questions.

## Activation

### Standalone
```
Received a spec-product.md and want to review before implementation.
```

### Via stelow (`critique` stage)
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

### critique:20 — Determine Workflow Dir & Mode

**Before launching parallel reviewers**, determine the active workflow directory.
When called via orchestrator, the workflow dir is available from session context.
When standalone, scan for the most recent workflow.

```bash
# Try session context first, then scan for most recent
WF_DIR=""
if [ -f "index.json" ] && grep -q '"workflow_status":' index.json 2>/dev/null; then
  WF_DIR="."
elif ls .stelow/*/*/index.json 2>/dev/null; then
  WF_DIR="$(ls -td .stelow/*/*/ 2>/dev/null | head -1)"
fi

WF_DIR="${WF_DIR%/}"  # Strip trailing slash
SPEC="$WF_DIR/plans/spec-product*.md"
SPEC_FILE=$(ls $SPEC 2>/dev/null | head -1) || SPEC_FILE=""
MODE="Full Product"
[ -n "$WF_DIR" ] && MODE=$(grep -oP '"mode":\s*"([^"]+)"' "$WF_DIR/index.json" | grep -oP '"([^"]+)"$' | tr -d '"' )
MODE=${MODE:-Full Product}
APPETITE=$(grep -oP '^appetite:\s*\K\S+' "$SPEC_FILE" 2>/dev/null || echo "Core")
FIT=$(grep -oP '^appetite_fit:\s*\K\S+' "$SPEC_FILE" 2>/dev/null || echo "fits")
```

**Mode is determined BEFORE parallel reviewers.** Subagents only CLASSIFY gaps
(severity + description + AI recommendation). They do NOT auto-resolve.
The parent applies mode-based behavior after consolidation.
This keeps subagents pure detectors, regardless of mode.

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

Each reads checklists.md from references/, outputs per output-format.md.
Subagents CLASSIFY only — they do NOT auto-resolve:
- Tag each gap as 🚨 / 🤔 / 🔎
- Recommended resolution (for parent to apply)
- One alternative per plausible trade-off

The parent applies mode-based behavior (resolve / ask) after consolidation.
```

> **Error recovery:** If any parallel subagent fails, retry once per the
> retry pattern in `references/cli-tools/subagents.md`. If it fails again,
> log as SKIPPED and proceed with remaining dimensions. A missing dimension
> is better than a deadlocked workflow.

### critique:40 — Consolidate into report

This step runs in the **parent LLM** (not a subagent). Merge all 5 parallel
reports into a single `critique-report.md`. Classify each gap per the table below.
The report is an internal artifact — gaps are listed with their severity,
description, AI recommendation, and alternatives (already generated by subagents).
Do NOT auto-resolve yet — that depends on mode (next step).

### 4. Gap Classification

| Tag | Severity | Effect |
|-----|----------|--------|
| 🚨 **Critical** | Blocking — missing essential definition | Always shown to user in Moderate/Full |
| 🤔 **Important** | Significant gap or risk | Shown if within top-N budget |
| 🔎 **Minor** | Polish or nice-to-have | Auto-resolved in all modes |

### critique:45 — Resolve Gaps by Mode

**Using `$MODE` and `$WF_DIR` determined in critique:20.**
This step runs in the **parent LLM** (same context as critic=40).
All 7 checklists run regardless of mode — mode only changes how gaps are resolved.

See `references/cli-tools/structured-question.md` for the `ask_user_question` tool.

**If `$MODE` is `Auto` or `Light`:**

All gaps (🚨, 🤔, 🔎) are auto-resolved per `references/auto-resolve-rules.md`.
If a gap has a clear best-practice default, apply it and mark "resolved by default."
Only genuinely ambiguous gaps are noted in the report but do NOT block the gate.

**If `$MODE` is `Moderate`:**

- 🔎 gaps → auto-resolved
- 🚨 + 🤔 → sorted by severity (🚨 first), **top-5 combined** presented via
  `ask_user_question` with multiSelect. Each option = one gap with label
  "Accept AI: {resolution}". Description states the gap and the trade-off.
  The AI recommendation is the first option per gap.

  > **When >5 moderate/critical gaps exist:** "Showing top-5 (most impactful).
  > Remaining N auto-resolved. All gaps plus AI recommendations are in the
  > spec for review during Gate."

- User selects which recommendations to accept.
- **Unselected** → treated as **accepted** (AI recommendation stands).
  No re-resolution needed.

**If `$MODE` is `Full Product` or `Full Product + Tech`:**

- 🔎 gaps → auto-resolved
- 🤔 gaps → **top-5** batched into one multiSelect question
- 🚨 gaps → **top-3** presented one-by-one (each its own question).
  AI recommendation is the first option labeled "(Recommended)."

  > **When >5 🤔 or >3 🚨 exist:** "Showing top-{N} (most impactful).
  > Remaining M auto-resolved but listed in the spec for Gate review."

**Mode not found (standalone):** Default to `Full Product` behavior.

**After resolving (all modes):** 

Save the resolved report:
```bash
REPORT="$WF_DIR/critiques/critique-report.md"
mkdir -p "$(dirname "$REPORT")"
save_report_content_to "$REPORT"
```

### critique:50 — Merge into spec-product.md

After gaps are resolved, update the plan document to reflect resolutions
and prepare it for the Plannotator Gate:

1. Read `$SPEC_FILE` (the original spec-product.md).
   If `$SPEC_FILE` is empty, derive from `$WF_DIR/plans/spec-product*.md`.
2. Apply auto-resolved gaps as inline changes to the relevant sections
   (e.g., fill missing states, add error handling, clarify flows).
3. Append section **"🟢 Resolved Gaps (Product Critique)"** at the bottom
   listing every gap found (including those asked to user) and how resolved.
4. Prepend section **"⚡ Gate Review — Critical Decisions"** at the **top**
   (right after title/frontmatter) listing the pushed gaps with:
   ```
   ### ⚡ Critical Decisions for Gate Review

   The questions below were answered during critique. Your selection is
   reflected in the spec. To override, annotate on the relevant section:

   1. **[Critical] Undefined empty state — User List** →
      AI resolved as: "Illustration + CTA 'Add first user'" (Recommended)
      Alternative: "Blank slate with loading skeleton"
      → If you prefer the alternative, annotate on the User List section

   2. **[Important] Missing error handling — Payment flow** →
      AI resolved as: "Retry 3x, then show friendly error with support link"
   ```
   This section ensures the Gate reviewer sees what was decided and can override
   via Plannotator annotations. The LLM reads annotations post-Gate and applies
   overrides.

5. Save as `$SPEC_FILE` (overwrite — this is the final version for the Gate)

---

## Output

```
.stelow/{YYYY-MM-DD}/{_dir}/critiques/
  critique-flows-states.md     ← parallel reviewer 1
  critique-data-system.md      ← parallel reviewer 2
  critique-affordances-ux.md   ← parallel reviewer 3
  critique-composition.md      ← parallel reviewer 4
  critique-feasibility.md      ← parallel reviewer 5
  critique-report.md           ← consolidated (internal report, all gaps)

{dir}/plans/spec-product.md       ← resolved version (critique:50 merge)
  → "⚡ Gate Review — Critical Decisions" prepended at top
  → "🟢 Resolved Gaps" appended at bottom
  → Inline updates applied per mode resolution
```

---

## Integration with other skills

### stelow (`critique` stage)

```
critique: Critique Gate
  └── cali-product-plan-critique (input: spec-product.md)
       ├── critique:20 — Determine mode + workflow dir
       ├── critique:30 — 5 parallel subagents (classify only, no resolve)
       ├── critique:40 — Consolidate into critique-report.md
       ├── critique:45 — Resolve gaps by mode (ask user if Moderate/Full)
       └── critique:50 — Merge resolutions → spec-product.md (with Gate sections)
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
