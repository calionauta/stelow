---
source: audit-skill (impeccable ecosystem)
author: impeccable team
copied_by: cali-product-planner
date: 2026-05-15
credits: https://github.com/impeccablehq/impeccable
---

# Audit Dimensions

5 dimensions for technical quality assessment.

## 1. Accessibility (A11y)

**Score 0-4:**
- 0: Inaccessible (fails WCAG A)
- 1: Major gaps (few ARIA labels, no keyboard nav)
- 2: Partial (some effort, significant gaps)
- 3: Good (WCAG AA mostly met, minor gaps)
- 4: Excellent (WCAG AA fully met, approaches AAA)

**Check for:**
- Contrast ratios < 4.5:1
- Missing ARIA labels and roles
- Keyboard navigation issues
- Semantic HTML (headings, landmarks)
- Missing alt text
- Form issues (labels, errors, required indicators)

## 2. Performance

**Score 0-4:** (same scale as above)

**Check for:**
- Layout thrashing (read/write in loops)
- Expensive animations (animating layout properties)
- Missing optimization (lazy loading, unoptimized assets)
- Bundle size (unnecessary imports)
- Render performance (unnecessary re-renders)

## 3. Theming

**Score 0-4:** (same scale as above)

**Check for:**
- Hard-coded colors (not using design tokens)
- Broken dark mode
- Inconsistent tokens
- Theme switching issues

## 4. Responsive Design

**Score 0-4:** (same scale as above)

**Check for:**
- Fixed widths breaking on mobile
- Touch targets < 44x44px
- Horizontal scroll
- Text scaling issues
- Missing breakpoints

## 5. Anti-Patterns (CRITICAL)

**Score 0-4:**
- 0: AI slop gallery (5+ tells)
- 1: Heavy AI aesthetic (3-4 tells)
- 2: Some tells (1-2 noticeable)
- 3: Mostly clean (subtle issues only)
- 4: No AI tells (distinctive, intentional design)

**Check for:**
- AI color palette
- Gradient text
- Dark glows / glassmorphism
- Hero metric layouts
- Identical card grids
- Generic fonts
- Gray on color backgrounds
- Nested cards
- Bounce easing
- Redundant copy

---

## Rating Bands

| Score | Band |
|-------|------|
| 18-20 | Excellent (minor polish) |
| 14-17 | Good (address weak dimensions) |
| 10-13 | Acceptable (significant work needed) |
| 6-9 | Poor (major overhaul) |
| 0-5 | Critical (fundamental issues) |

---

## Severity Tagging

Every issue should be tagged:

- **P0 Blocking**: Prevents task completion — fix immediately
- **P1 Major**: Significant difficulty or WCAG AA violation — fix before release
- **P2 Minor**: Annoyance, workaround exists — fix in next pass
- **P3 Polish**: Nice-to-fix, no real user impact — fix if time permits