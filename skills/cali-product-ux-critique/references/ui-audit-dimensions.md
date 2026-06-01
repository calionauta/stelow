---
source: cali-product-ui-critique
author: cali-product-workflow
date: 2026-05-30
---

# UI Audit Dimensions

2 dimensões para avaliação de qualidade de UI.

**Related skills:** `cali-product-interface-alternatives` generates 5 proposal alternatives (Work Pattern Declaration, Design Smell Audit, State Coverage Table). This audit dimension complements that generation workflow — use after proposals are created, or use standalone against existing implementations.

**Canonical source for design smells:** This file's AI Slop Detection section (14 tells) is the canonical source; `interface-alternatives` references its 10-smell subset. Keep both in sync.

## 1. Accessibility (A11y)

**Score 0-4:**
- 0: Inaccessible (fails WCAG A)
- 1: Major gaps (few ARIA labels, no keyboard nav)
- 2: Partial (some effort, significant gaps)
- 3: Good (WCAG AA mostly met, minor gaps)
- 4: Excellent (WCAG AA fully met, approaches AAA)

### Checklist

| # | Item | Verificação | Modo |
|---|------|-------------|------|
| 1 | **Color Contrast** | Contrast ratios ≥ 4.5:1 for normal text, ≥ 3:1 for large text (WCAG AA) | Site / Screenshot |
| 2 | **ARIA Labels & Roles** | Interactive elements have descriptive aria-label, aria-labelledby, or visible label | Codebase / Site |
| 3 | **Keyboard Navigation** | All interactive elements reachable and operable via keyboard (Tab, Enter, Escape) | Site |
| 4 | **Focus Management** | Visible focus indicators, logical tab order, focus trap in modals, focus restored on close | Codebase / Site |
| 5 | **Semantic HTML** | Proper heading hierarchy (h1→h2→h3), landmark elements (nav, main, aside), list semantics | Codebase |
| 6 | **Alt Text** | All non-decorative images have meaningful alt text; decorative images have alt="" | Codebase / Site |
| 7 | **Form Labels & Errors** | All inputs have associated labels; error messages are clear and programmatically associated | Codebase / Site |
| 8 | **Required Indicators** | Required fields visually marked and have aria-required="true" | Codebase / Site |
| 9 | **Reduced Motion** | `prefers-reduced-motion` respected — animations either disabled or replaced with non-moving transitions (WCAG SC 2.3.3) | Codebase / Site |
| 10 | **Forced Colors** | `forced-colors: active` supported — information is not conveyed through color alone; icons, borders, and text remain distinguishable (WCAG SC 1.1.1, 1.4.1) | Codebase / Site |
| 11 | **Color Scheme Adaptation** | `prefers-color-scheme` respected — dark mode and light mode both render legibly with correct contrast; no information lost in either mode | Codebase / Site |

### Severity Mapping

| Issue | Default Severity |
|-------|-----------------|
| Missing alt text on key image | P1 Major |
| Contrast ratio < 3:1 | P0 Blocking |
| Contrast ratio 3:1–4.49:1 | P1 Major |
| No keyboard access to primary action | P0 Blocking |
| Missing ARIA label on icon button | P1 Major |
| Broken heading hierarchy | P2 Minor |
| Missing form label | P1 Major |

---

## 2. Design Quality

**Score 0-4:**
- 0: Broken (fundamental design issues)
- 1: Poor (significant problems in multiple dimensions)
- 2: Acceptable (works but has clear issues)
- 3: Good (minor polish needed)
- 4: Excellent (distinctive, intentional design)

### 0. Compositional Quality (Purpose-Layout Alignment)

Verify that the spatial composition matches the work pattern the surface serves.
This is the most fundamental design decision — layout must be a consequence of purpose, not a default.

| # | Item | O que verificar |
|---|------|----------------|
| 0.1 | **Work Pattern Identification** | The surface has an identifiable work pattern (Monitor, Operate, Compare, Configure, Learn, Decide, Explore), not generic "it's a UI" |
| 0.2 | **Layout-Pattern Match** | The spatial composition matches the work pattern: Monitor = scan-density, Decide = focused hero, Learn = narrative rhythm, etc. |
| 0.3 | **No Contradiction** | The layout does NOT contradict the pattern (e.g. Monitor as centered hero, Decide as dense data table, Explore as static pitch) |
| 0.4 | **Density Strategy** | Sparse vs dense layout matches the pattern: sparse works for Decide/Learn, dense works for Monitor/Compare |
| 0.5 | **Multi-Pattern Hierarchy** | If multiple patterns coexist, there is a clear primary pattern and secondary zones respect that hierarchy |

### 0a. Interaction States Coverage

State coverage per interactive component is the most quantitative proxy for design quality.
- Human baseline: 7–9 states per component
- AI baseline (typical): 1–2 states (idle, maybe hover)
- Target: ≥6 states per interactive component

#### Component Typing

| Type | Label | Baseline applies? | Examples |
|------|-------|:-----------------:|----------|
| **Interactive** | `Int` | ✅ ≥6 applicable states | Buttons, inputs, switches, links, clickable cards |
| **Display** | `Disp` | ❌ (visual-only) | Headings, separators, decorative illustrations, static badges, text blocks |

Only `Int` components are scored against the baseline. `Disp` components are informational only.

| # | State | Description |
|---|-------|-------------|
| 0a.1 | **Idle** | Default rest state |
| 0a.2 | **Hover** | Visual feedback on pointer hover |
| 0a.3 | **Active/Pressed** | Momentary feedback on press/click |
| 0a.4 | **Focus** | Visible focus indicator for keyboard nav |
| 0a.5 | **Disabled** | Visually distinct with clear reasoning |
| 0a.6 | **Loading** | Per-component loading indicator |
| 0a.7 | **Empty** | Meaningful empty state with guidance |
| 0a.8 | **Error** | Per-component error with recovery path |
| 0a.9 | **Overflow** | Handles truncation, scroll, or expansion gracefully |

**Scoring** (over applicable states only): ≥6 = ✅, 4-5 = ⚠️, <4 = ❌
Scoring aligns with `interface-alternatives` Section 7: coverage = `(✅ + ⬆️) / (✅ + ❌ + ⬆️)`, N/A excluded.
See `interface-alternatives/references/interface-rules.md` for full N/A semantics and escape hatches.

### 2.1 Visual Hierarchy

| # | Item | O que verificar |
|---|------|----------------|
| 1 | **Primary Action** | Each screen has ONE clear primary action (button, CTA) |
| 2 | **Visual Weight** | Important elements are visually distinct (size, color, position) |
| 3 | **Spacing & Alignment** | Consistent spacing, aligned elements, clear grouping |
| 4 | **Typography Scale** | Clear type hierarchy (headings, subheadings, body) with consistent sizing |

### 2.2 Cognitive Load

| # | Item | O que verificar |
|---|------|----------------|
| 1 | **Progressive Disclosure** | Complexity revealed only when needed (no info dump) |
| 2 | **Information Density** | Not excessive visible information per screen |
| 3 | **Grouping** | Similar items logically grouped (visual proximity, borders, backgrounds) |
| 4 | **Labeling** | Consistent, clear labels throughout |
| 5 | **Decision Points** | Decision points clearly indicated, not hidden |

### 2.3 Consistency

| # | Item | O que verificar |
|---|------|----------------|
| 1 | **Design Tokens** | Colors, spacing, typography use tokens/ variables, not hard-coded values |
| 2 | **Pattern Consistency** | Same UI patterns behave identically (buttons, cards, modals) |
| 3 | **Icon Style** | Consistent icon style (outline vs filled, stroke width) |
| 4 | **Border Radius** | Consistent border radius across similar components |

### 2.4 Mobile / Responsive

| # | Item | O que verificar |
|---|------|----------------|
| 1 | **Touch Targets** | Interactive elements ≥ 44x44px |
| 2 | **No Horizontal Scroll** | Content fits viewport width at common breakpoints (375px, 768px) |
| 3 | **Breakpoints** | Layout adapts at reasonable breakpoints, not just scaling |
| 4 | **Text Scaling** | Text reflows when zoomed 200% without truncation or overlap |

### 2.5 AI Slop Detection

Based on empirical research (~10 patterns account for ~90% of the "looks AI-generated" signal):

| # | Tell | O que verificar |
|---|------|----------------|
| 1 | **Tech gradient** | Blue-violet glossy energy on everything — color used as decoration, not hierarchy |
| 2 | **Generic tech hue** | Indigo "because software" (not purple) — no intentional hue selection for brand or emotion |
| 3 | **Gradient text** | Headings with gradient fills — gratuitous effect without purpose |
| 4 | **Feature tile grid** | Icon + heading + sentence × N, all equal weight, nothing prioritized |
| 5 | **Accent rail** | Colored stripe on card edge = decoration pretending to be organization |
| 6 | **Unearned blur / glassmorphism** | Excessive blur, glow effects, frosted glass without a depth system |
| 7 | **Stat monument** | Oversized numbers filling space where a product story belongs |
| 8 | **Icon topper** | Rounded-square icon above every heading as mechanical template filler |
| 9 | **Center stack** | Everything centered because no composition decision was made |
| 10 | **Bounce easing** | Bouncy animations on everything — easing used because API has it, not because it's purposeful |
| 11 | **Default type** | Inter, Roboto as sole typeface — font is whatever the training distribution likes, no brand character |
| 12 | **Gray on color backgrounds** | Low-contrast gray text over colored backgrounds |
| 13 | **Nested cards** | Cards inside cards inside cards |
| 14 | **Redundant microcopy** | "Click here to get started today!" — verbose, empty copy |

**Verdict by tell count:**
- 0 tells: No AI slop — distinctive, intentional design ✅
- 1-2 tells: Mostly clean — subtle issues only 🔎
- 3-4 tells: Some tells — noticeable AI aesthetic 🤔
- 5+ tells: AI slop gallery — heavy redesign recommended 🚨

> **Clustering note:** Tech gradient (#1), stat monument (#7), and center stack (#9) co-occur in ~60% of AI-generated landing pages. If you detect one, actively check for the other two — they are likely present. Bounce everywhere (#10) and default type (#11) also cluster frequently.

---

## Rating Bands (combined accessibility + design)

| Score Range | Band |
|-------------|------|
| 7-8 | Excellent (minor polish) |
| 5-6 | Good (address weak dimensions) |
| 3-4 | Acceptable (significant work needed) |
| 1-2 | Poor (major overhaul) |
| 0 | Critical (fundamental issues) |

---

## Severity Definitions

| Severity | Definition | When to Fix |
|----------|------------|-------------|
| **P0 — Blocking** | Prevents task completion, WCAG A failure, data loss possible | Before any release |
| **P1 — Major** | Significant difficulty, WCAG AA violation | Before public release |
| **P2 — Minor** | Minor annoyance, workaround exists | Next release cycle |
| **P3 — Polish** | Nice-to-have, no real user impact | If time permits |
