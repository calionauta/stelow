---
source: cali-product-ux-critique
author: stelow
date: 2026-05-30
---

# UX Critique Frameworks

Frameworks for complete UX evaluation. Used by all three audit modes
(Live Site, Codebase, Screenshot).

---

## 1. Nielsen's 10 Usability Heuristics

### Full Checklist

| # | Heuristic | Description | Score 0-4 |
|---|-----------|-------------|-----------|
| 1 | **Visibility of System Status** | User always knows what's happening, loading states, progress indicators | ? |
| 2 | **Match System and Real World** | Language familiar to user, real-world metaphors, natural conventions | ? |
| 3 | **User Control and Freedom** | Easy exit, undo everywhere, clear emergency exits | ? |
| 4 | **Consistency and Standards** | Identical actions behave identically, platform conventions followed | ? |
| 5 | **Error Prevention** | System prevents errors before they happen, not just recovering | ? |
| 6 | **Recognition Rather Than Recall** | Everything visible, no memory required, options shown not hidden | ? |
| 7 | **Flexibility and Efficiency of Use** | Works for beginners AND experts, shortcuts, customization | ? |
| 8 | **Aesthetic and Minimalist Design** | Everything necessary, nothing superfluous, clear visual hierarchy | ? |
| 9 | **Help Users Recognize, Diagnose, Recover** | Error messages explain problem clearly, suggest resolution | ? |
| 10 | **Help and Documentation** | Self-explanatory design, docs easy to find and search | ? |

### Scoring Guide

| Score | Meaning | When assigned |
|-------|---------|--------------|
| 4 | Excellent — genuinely no room for improvement | Rare |
| 3 | Good — minor polish needed | Most good UIs |
| 2 | Acceptable — fulfills requirement but room for improvement | Common |
| 1 | Poor — significant issue, workaround exists | Should be fixed |
| 0 | Critical failure — completely absent or broken | Must be fixed |

### Rating Bands

| Total | Level |
|-------|-------|
| 36-40 | Exceptional |
| 28-35 | Good |
| 20-27 | Acceptable |
| 12-19 | Poor |
| 0-11 | Critical |

### Detailed Anchors per Heuristic

| Heuristic | Score 4 (Excellent) | Score 0 (Critical) |
|-----------|---------------------|---------------------|
| **1. Visibility** | Always know what's happening, where you are, loading states clear | No feedback whatsoever |
| **2. Match Real World** | Language entirely familiar, correct metaphors | Completely alien interface |
| **3. User Control** | Easy exit, undo everywhere, clear emergency exits | No way to reverse anything |
| **4. Consistency** | Identical actions always behave identically | Complete inconsistency |
| **5. Error Prevention** | System prevents errors before they happen | System actively causes errors |
| **6. Recognition** | Everything visible, no memory required | Entirely memory-based |
| **7. Flexibility** | Works for beginners AND experts | Only works for one type |
| **8. Aesthetic** | Everything necessary, nothing superfluous | Overwhelming, maximally cluttered |
| **9. Error Recovery** | Errors explain and resolve instantly | Cryptic errors, no recovery |
| **10. Help** | Self-explanatory, docs rarely needed | No documentation |

---

## 2. Emotional Journey Assessment

### Peak-End Rule

- **Peak:** Is the most intense moment of the experience positive?
- **End:** Does the experience end well (not on a confirmation dialog or error)?

### Emotional Valleys to Check

| Moment | Risk | Design Intervention Needed |
|--------|------|---------------------------|
| Payment / checkout | Anxiety about money, data safety | Progress indicator, security badges, clear summary |
| Delete / destructive action | Fear of irreversible loss | Confirmation dialog, undo option, time-delay |
| Commit / submit | Uncertainty about what happens next | Success page, confirmation email, next steps |
| First-time onboarding | Confusion, feeling lost | Guided tour, empty states with clear calls-to-action |
| Account creation | Friction, data privacy concern | Social login option, minimal fields, clear privacy policy |
| Error / failure state | Frustration, helplessness | Clear error message, resolution path, human tone |
| Long wait time (5s+) | Impatience, abandonment | Progress bar, estimated time remaining, engaging animation |

### Design Interventions to Look For

- ✅ Progress indicators
- ✅ Reassurance copy
- ✅ Undo options
- ✅ Clear feedback
- ✅ Confetti / celebration
- ✅ Estimated time remaining
- ✅ Security badges / trust markers
- ✅ Human error messaging (not "Error 500")

---

## 3. Design Personas (for evaluation)

### Core Personas

| Persona | Profile | When to Use | Key Concern |
|---------|---------|-------------|-------------|
| **Alex** (Power User) | Uses daily, knows shortcuts, wants efficiency | Developer tools, dashboards, analytics | Keyboard nav, tab order, bulk actions |
| **Jordan** (First-Timer) | New, needs guidance, abandons if confused | Consumer apps, onboarding, sign-up | Empty states, onboarding clarity, help |
| **Sam** (Manager) | Needs ROI proof, reviews metrics, delegates | Analytics, enterprise, reports | Dashboard clarity, export, team features |
| **Morgan** (Accessibility) | Screen reader, keyboard nav, high contrast | All interfaces | WCAG compliance, ARIA, focus, contrast |
| **Taylor** (Mobile) | On-the-go, distracted, one-handed | Mobile-first or responsive apps | Touch targets ≥44px, no horizontal scroll, thumb zones |

### Persona Walkthrough Format

For each selected persona, identify specific failures:

```
**Alex (Power User)**: No keyboard shortcuts detected.
- Element: Primary actions require 8 mouse clicks
- Impact: Must use mouse for repetitive task

**Morgan (Accessibility)**: Screen reader can't navigate chart.
- Element: Chart SVG has no aria-label or role="img"
- Impact: Chart data is invisible to blind users
```

### Persona Selection Guide

| Interface Type | Primary Persona | Secondary |
|----------------|----------------|-----------|
| Dashboard / Analytics | Alex | Sam, Morgan |
| Consumer App | Jordan | Taylor, Morgan |
| Developer Tool | Alex | Sam |
| Enterprise SaaS | Alex, Sam | Morgan |
| Mobile App | Taylor | Jordan, Morgan |
| E-commerce | Jordan | Sam, Taylor |
| Healthcare | Morgan | Jordan |
| Onboarding Flow | Jordan | Taylor |

---

## 4. Cognitive Load Assessment

### 8-Item Checklist

| # | Item | Check |
|---|------|-------|
| 1 | **Primary Action** | Does each screen have ONE clear primary action? |
| 2 | **Progressive Disclosure** | Is complexity revealed only when needed? |
| 3 | **Decision Points** | Are decision points clearly indicated? |
| 4 | **Information Density** | Is there excessive visible information? |
| 5 | **Grouping** | Are similar items grouped logically? |
| 6 | **Navigation** | Is navigation predictable and consistent? |
| 7 | **Affordances** | Are interactive elements clearly marked? |
| 8 | **Labeling** | Is labeling consistent throughout? |

### Load Categories

| Failures | Load Level |
|----------|------------|
| 0-1 | Low (good) |
| 2-3 | Moderate |
| 4+ | Critical |

### Memory Burden Rule

**Recognition > Recall:**
- Options should be visible, not remembered
- Labels should be on screen, not hidden
- State should be visible, not inferred
- Never force user to remember information from a previous page

---

## 5. AI Slop Detection

### The 10 Tells

| # | Tell | What to Look For |
|---|------|------------------|
| 1 | AI color palette | Vivid purples, blues, greens in combination — generic gradient |
| 2 | Gradient text | Headings with gradient fills |
| 3 | Dark glows / glassmorphism | Excessive blur, glow effects, frosted glass |
| 4 | Hero metric layouts | Big numbers on top, decorative cards underneath |
| 5 | Identical card grids | Perfectly uniform card grid with no content variation |
| 6 | Generic fonts | Inter, Roboto as sole typeface |
| 7 | Gray on color backgrounds | Low-contrast gray text over colored backgrounds |
| 8 | Nested cards | Cards inside cards inside cards |
| 9 | Bounce easing | Bouncy animations on everything |
| 10 | Redundant microcopy | Verbose, empty copy like "Click here to get started today!" |

### Anti-Patterns

- Low contrast text
- Inconsistent border radius
- Icon-only buttons without labels
- "Get started" as sole CTA
- Excessive whitespace or no whitespace
- Missing hover/focus states

### Verdict by Tell Count

| Tells | Verdict |
|-------|---------|
| 0 | No AI tells — distinctive, intentional design |
| 1-2 | Mostly clean — subtle issues only |
| 3-4 | Some tells — noticeable AI aesthetic |
| 5+ | AI slop gallery — heavy redesign recommended |

### DO Guidelines

- ✅ Clear visual hierarchy
- ✅ Purposeful use of color
- ✅ Consistent spacing and alignment
- ✅ Meaningful motion (not decoration)
- ✅ Labels that communicate intent
- ✅ Accessible by default
- ✅ Responsive to context
- ✅ Honest about what it is

---

## 6. Severity Definitions

| Severity | Definition | When to Fix |
|----------|------------|-------------|
| **P0 — Blocking** | Prevents task completion, WCAG A failure, data loss possible | Before any release |
| **P1 — Major** | Significant difficulty, WCAG AA violation | Before public release |
| **P2 — Minor** | Minor annoyance, workaround exists | Next release cycle |
| **P3 — Polish** | Nice-to-have, no real user impact | If time permits |

---

## 7. Design Context Gathering Protocol

Before running the UX audit:

1. **Identify interface type** — What does this interface accomplish?
2. **Determine audience** — Who will use this?
3. **Understand brand** — Intended feel/tone (professional, playful, minimal, etc.)
4. **Check for design system** — Tokens, patterns, existing documentation
5. **Note constraints** — Platform, browser support, performance budget
