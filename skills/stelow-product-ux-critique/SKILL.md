---
name: stelow-product-ux-critique
description: >
  [stelow] Full UX critique for visual interfaces. Accepts a live URL, source code directory,
  or screenshot image. Evaluates accessibility (WCAG AA), Nielsen's 10 heuristics, visual
  hierarchy, cognitive load, consistency, mobile responsiveness, AI slop, emotional journey,
  and design personas — then generates a classified gap report.
  Standalone or integrated into stelow and stelow-product-testing-execution.
metadata:
  frequency: weekly
  category: product
  context-cost: medium
  author: calionauta
  author-url: https://github.com/calionauta
---

**Standalone awareness:** inside stelow, appetite gates critique depth (Lean → static a11y baseline, Core → codebase mode, Complete → live site). Standalone defaults to Core appetite (codebase/browserless mode, ~80% coverage). Works with URL, source directory, or screenshot — no stelow dependency for core audit logic.

# UX Critique

> **Focus:** Complete UX audit of interfaces — visual accessibility, usability, design,
> emotional journey, and AI slop detection.
> **Inputs:** URL (live site), directory (source code), or screenshot (image).
> **Output:** Classified report with gaps (🚨/🤔/🔎) + actionable recommendations.

> **Tools:** See `references/cli-tools/agent_browser.md` and `references/cli-tools/subagents.md` for tool patterns.

## Overview

Full UX audit for visual interfaces — accessibility (WCAG AA), Nielsen heuristics, visual hierarchy,
cognitive load, consistency, mobile/responsive, AI slop, emotional journey, and design personas.

Accepts **3 input types**, each activating a different subset of dimensions:

| Input | Detects | Dimensions covered |
|-------|---------|-------------------|
| **URL** | `http://` or `https://` | **All** — full live audit |
| **Codebase** | Source code directory | **~80%** without browser (except exact contrast, real keyboard, screen reader) |
| **Screenshot** | `.png` `.jpg` `.webp` file | **~60%** — visual hierarchy, AI slop, estimated contrast, cognitive load |

### Appetite Gate (auto-skip for scopes without UI changes)

**Before running UX critique**, check if the scope involves visual UI changes
and if appetite warrants a full audit.

```bash
# Read appetite from stelow context or env var; default Core (via canonical helper).
WF_DIR="$(ls -td .stelow/*/*/ 2>/dev/null | head -1)"
# shellcheck disable=SC1091
source "$(dirname "${BASH_SOURCE[0]:-$0}")/../../stelow-product-orchestrator/references/cli-tools/read-config.sh" 2>/dev/null || true
APPETITE="${APPETITE:-$(stelow_read_appetite 2>/dev/null || echo "Core")}"
# Check if any visual files changed
UI_FILES=$(git diff --name-only HEAD~1 2>/dev/null | grep -cE '\.(templ|html|tsx|jsx|css)$' || echo "0")
```

| Appetite | UI files changed | Action |
|----------|-----------------|--------|
| `Lean` | any | **Static a11y/lint baseline.** No browser/live audit unless upgraded. |
| `Core` | 0 | **Static a11y/lint baseline.** No browser. Skip full audit when no UI changed. |
| `Core` | 1+ | **Codebase mode (~80%).** No browser. Syntactic a11y + AI slop only. |
| `Complete` | 0 | **Skip** (no UI to audit) |
| `Complete` | 1+ | **Live Site mode.** Full audit with browser + real a11y. Human reviews report in Product Spec + Interface + Scopes / Product Spec + Interface + Tech Review mode. |

**Rationale:** UX critique with a browser is expensive (opens URL, navigates, captures screenshots). For Lean, keep the static a11y/lint baseline; for Core, use codebase/browserless review; for Complete, run live-site audit when UI exists. Appetite changes audit depth, not whether UI quality matters.

### Standalone
Read this file and jump to the relevant mode.

### Via stelow-product-testing-execution (Phase 3)
The testing-execution orchestrator loads this skill automatically when `Has visual UI? → YES`.

### Via stelow (Stage Verification)
The `ui-quality` stage in `stages/verification.md` delegates to this skill.

---

## 🔀 Input Router

```
Provided input:
  ├── Is it a URL (http:// or https://)?
  │   └→ 🌐 Mode: Live Site Audit (all dimensions)
  ├── Is it a source directory or code file?
  │   └→ 📁 Mode: Codebase Audit (~80% coverage)
  ├── Is it an image (.png/.jpg/.webp)?
  │   └→ 🖼️ Mode: Screenshot Audit (~60% coverage)
  └── User described the interface/component verbally?
      └→ Use description as context. Scan current directory for
         visual source files. If none found, ask: "What interface do
         you want reviewed? Provide a URL, directory, screenshot, or
         describe the component."
```

---

## 🌐 Mode: Live Site Audit

Audita um site ao vivo abrindo no browser e avaliando a UX completa.

### 1. Read reference files

| File | Covers |
|------|--------|
| `references/ui-audit-dimensions.md` | Accessibility (WCAG) + Design Quality checklists |
| `references/ux-frameworks.md` | Nielsen 10, Emotional Journey, Personas |
| `references/output-format.md` | Report format |

### 2. Open and explore

Use the browser tool (see `references/cli-tools/agent_browser.md`) to open the URL and explore main flows (login, primary action, empty state, error state, destructive confirmation, forms).

### 3. Run audit via subagent

Use the subagents tool (see `references/cli-tools/subagents.md`) to audit the live site:

```
Agent: reviewer
Task: Audit live site for UX quality (Live Site mode)
Reads: ui-audit-dimensions.md, ux-frameworks.md
Mode: {URL}
Output: .stelow-ux-critique/live-audit-report.md (per output-format.md)
```

The reviewer applies all checklists from the reference files and produces a report
with severity-classified findings (P0-P3), dimension tags, and actionable recommendations.

### 4. Gap Resolution

| Severity | Action |
|------------|------|
| **P0 — Blocking** | Fix immediately |
| **P1 — Major** | Fix before release |
| **P2 — Minor** | Next cycle |
| **P3 — Polish** | If time permits |

---

## 📁 Mode: Codebase Audit

Audits source code of UI components without needing a browser.
Cobre ~80% dos issues (AccessGuru arXiv 2025).

### 1. Read references

| File | Covers |
|------|--------|
| `references/ui-audit-dimensions.md` | Accessibility + Design Quality checklists |
| `references/ux-frameworks.md` | Nielsen heuristics, AI slop, cognitive load |

### 2. Discover structure

```bash
find {INPUT_PATH} -maxdepth 3 -type f \( -name "*.templ" -o -name "*.html" -o -name "*.tsx" -o -name "*.jsx" -o -name "*.css" -o -name "*.py" \) | head -50
```

### 3. Run audit via subagent

Use the subagents tool (see `references/cli-tools/subagents.md`) to audit the codebase:

```
Agent: reviewer
Task: Audit codebase for UX quality (Codebase mode)
Reads: ui-audit-dimensions.md, ux-frameworks.md
Input: {INPUT_PATH}
Output: .stelow-ux-critique/codebase-audit-report.md (per output-format.md)
```

The reviewer applies checklists adapted for source code analysis:
- ARIA attributes, heading hierarchy, alt text, form labels, keyboard event handlers
- Visual hierarchy via component structure, cognitive load via props/state complexity
- Consistency via design tokens, responsiveness via media queries
- AI slop detection (generic patterns, redundant microcopy, icon-only buttons)

For each issue: severity, dimension, if it can be verified from source or [needs browser].

### 4. Flag what needs browser

Issues marked as `[needs browser]` must be verified live.

---

## 🖼️ Mode: Screenshot Audit

Audits a screenshot image for quick visual analysis (~60% coverage).

### 1. Read references

| File | Covers |
|------|--------|
| `references/ui-audit-dimensions.md` | Design Quality (visual) |
| `references/ux-frameworks.md` | Nielsen, personas, AI slop |

### 2. Analyze screenshot

Read the image file for visual analysis. Use o subagents tool (see `references/cli-tools/subagents.md`) to audit:

```
Agent: reviewer
Task: Audit screenshot for UX quality (Screenshot mode)
Reads: ui-audit-dimensions.md, ux-frameworks.md
Input: {INPUT_PATH}
Output: .stelow-ux-critique/screenshot-audit-report.md (per output-format.md)
```

The reviewer is limited to what's visible: estimated contrast, alt text presence,
heading hierarchy, visual density. Notes limitations: [needs live testing] for
keyboard, screen reader, focus, interactive states, animation.

### 3. Limitations

| Covers | Does not cover |
|-------|-----------|
| Estimated contrast | Exact contrast |
| Visual hierarchy | Keyboard navigation |
| AI slop detection | Screen reader |
| Cognitive load | Focus management |
| Nielsen heuristics (visual) | Interactive states |
| Personas (visual) | ARIA attributes |
| Layout/spacing | Animations |

---

## Output

| Mode | Output Path |
|------|-------------|
| **Live Site** | `.stelow-ux-critique/live-audit-report.md` |
| **Codebase** | `.stelow-ux-critique/codebase-audit-report.md` |
| **Screenshot** | `.stelow-ux-critique/screenshot-audit-report.md` |

```
.stelow-ux-critique/
  {mode}-audit-report.md     ← main report
```

---

## Integration with Other Skills

### stelow-product-testing-execution (Phase 3)

Phase 3 delegates to this skill:

```
Phase 3: UI/UX Quality
  └── stelow-product-ux-critique (URL or codebase mode)
       ├── Accessibility (WCAG AA)
       ├── Nielsen 10 Heuristics
       ├── Design Quality (hierarchy, consistency, mobile)
       ├── Emotional Journey
       ├── Design Personas
       └── AI Slop Detection
```

### stelow (Stage Verification)

The `ui-quality` stage in `stages/verification.md` delegates to this skill on tiers
Quick (codebase mode) and Full (live site mode).

### stelow-product-scope-executor

When a visual scope is executed, the executor delegates UX verification to
this skill.

---

## Environment Adaptation

If agent_browser is not available (e.g. other CLIs), use Codebase mode
(~80% coverage) and note in the report what could not be verified.

See `references/cli-tools/agent_browser.md` for availability details.
