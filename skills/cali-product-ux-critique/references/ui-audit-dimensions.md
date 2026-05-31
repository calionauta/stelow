---
source: cali-product-ui-critique
author: cali-product-workflow
date: 2026-05-30
---

# UI Audit Dimensions

2 dimensões para avaliação de qualidade de UI.

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

| # | Tell | O que verificar |
|---|------|----------------|
| 1 | AI color palette | Vivid purples, blues, greens in combination — generic gradient |
| 2 | Gradient text | Headings with gradient fills |
| 3 | Dark glows / glassmorphism | Excessive blur, glow effects, frosted glass |
| 4 | Hero metric layouts | Big numbers on top, decorative cards underneath |
| 5 | Identical card grids | Perfectly uniform card grid with no content variation |
| 6 | Generic fonts | Inter, Roboto as sole typeface with no character |
| 7 | Gray on color backgrounds | Low-contrast gray text over colored backgrounds |
| 8 | Nested cards | Cards inside cards inside cards |
| 9 | Bounce easing | Bouncy animations on everything |
| 10 | Redundant microcopy | "Click here to get started today!" — verbose, empty |

**Verdict by tell count:**
- 0 tells: No AI slop — distinctive, intentional design ✅
- 1-2 tells: Mostly clean — subtle issues only 🔎
- 3-4 tells: Some tells — noticeable AI aesthetic 🤔
- 5+ tells: AI slop gallery — heavy redesign recommended 🚨

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
