---
source: critique-skill (impeccable ecosystem)
author: impeccable team
copied_by: cali-product-planner
date: 2026-05-15
credits: https://github.com/impeccablehq/impeccable
applies_to: [plan, site]
---

# Critique Frameworks

Frameworks for UX/design evaluation, used by the critique skill.

---

## Nielsen's 10 Usability Heuristics

| # | Heuristic | Score 0-4 |
|---|-----------|-----------|
| 1 | Visibility of System Status | ? |
| 2 | Match System and Real World | ? |
| 3 | User Control and Freedom | ? |
| 4 | Consistency and Standards | ? |
| 5 | Error Prevention | ? |
| 6 | Recognition Rather Than Recall | ? |
| 7 | Flexibility and Efficiency of Use | ? |
| 8 | Aesthetic and Minimalist Design | ? |
| 9 | Help Users Recognize, Diagnose, Recover | ? |
| 10 | Help and Documentation | ? |

**Scoring guide:**
- 4: Genuinely excellent — no room for improvement
- 3: Solid, minor polish needed
- 2: Fulfills requirement but room for improvement
- 1: Significant issue, workaround exists
- 0: Critical failure

**Rating bands:**
- 36-40: Exceptional
- 28-35: Good
- 20-27: Acceptable
- 12-19: Poor
- 0-11: Critical

### Detailed Heuristics (for deep evaluation)

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

## Emotional Journey Assessment

**Peak-End Rule:**
- Is the most intense moment positive?
- Does the experience end well?

**Emotional Valleys:**
- Check for anxiety spikes at high-stakes moments:
  - Payment flows
  - Delete confirmations
  - Commit/submit actions

**Design Interventions to Look For:**
- Progress indicators
- Reassurance copy
- Undo options
- Clear feedback

---

## Cognitive Load Assessment

### 8-Item Checklist

| # | Item | Check |
|---|------|-------|
| 1 | Primary Action | Does each screen have ONE clear primary action? |
| 2 | Progressive Disclosure | Is complexity revealed only when needed? |
| 3 | Decision Points | Are decision points clearly indicated? |
| 4 | Information Density | Is there excessive visible information? |
| 5 | Grouping | Are similar items grouped logically? |
| 6 | Navigation | Is navigation predictable and consistent? |
| 7 | Affordances | Are interactive elements clearly marked? |
| 8 | Labeling | Is labeling consistent throughout? |

**Load categories:**
- 0-1 failures: Low (good)
- 2-3 failures: Moderate
- 4+ failures: Critical

### Memory Burden Rules

**Recognition > Recall:**
- Options should be visible, not remembered
- Labels should be on-screen, not hidden
- State should be visible, not inferred

---

## Design Personas (for evaluation)

### Core Personas

| Persona | Profile | When to Use |
|---------|---------|-------------|
| **Alex** (Power User) | Uses daily, knows shortcuts, wants efficiency | Developer tools, dashboards |
| **Jordan** (First-Timer) | New, needs guidance, abandons if confused | Consumer apps, onboarding |
| **Sam** (Manager) | Needs ROI proof, reviews metrics, delegates | Analytics, enterprise |
| **Morgan** (Accessibility) | Screen reader, keyboard nav, high contrast needs | All interfaces |
| **Taylor** (Mobile) | On-the-go, distracted, one-handed | Mobile-first apps |

### Persona Red Flags

For each selected persona, identify specific failures:

```
**Alex (Power User)**: No keyboard shortcuts detected.
- Element: Primary actions require 8 mouse clicks
- Impact: Must use mouse for repetitive task
```

### Persona Selection Guide

| Interface Type | Primary | Secondary |
|----------------|---------|-----------|
| Dashboard/Analytics | Alex, Sam | Jordan |
| Consumer App | Jordan, Taylor | Morgan |
| Developer Tool | Alex | Sam |
| Enterprise SaaS | Alex, Sam | Morgan |
| Mobile App | Taylor, Jordan | Morgan |

---

## AI Slop Detection (CRITICAL)

Does this look like every other AI-generated interface?

**Test**: If someone said "AI made this," would you believe them immediately?

### DON'T Guidelines

**AI Slop Tells:**
- ❌ Vibrant AI color palette (vivid purples, blues, greens)
- ❌ Gradient text on headings
- ❌ Dark mode with glassmorphism and glows
- ❌ Hero metric layouts (big numbers on top)
- ❌ Identical card grids everywhere
- ❌ Generic fonts (Inter, Roboto)
- ❌ Gray text on colored backgrounds
- ❌ Nested cards (cards inside cards)
- ❌ Bounce easing on animations
- ❌ Redundant microcopy ("Click here to click here")

**Anti-Patterns:**
- ❌ Low contrast text
- ❌ Inconsistent border radius
- ❌ Icon-only buttons without labels
- ❌ "Get started" as sole CTA

### DO Guidelines

**Design that works:**
- ✅ Clear visual hierarchy
- ✅ Purposeful use of color
- ✅ Consistent spacing and alignment
- ✅ Meaningful motion (not decoration)
- ✅ Labels that communicate intent
- ✅ Accessible by default
- ✅ Responsive to context
- ✅ Honest about what it is

### Verdict Levels

| Level | Tells Count |
|-------|-------------|
| **AI slop gallery** | 5+ tells |
| **Heavy AI aesthetic** | 3-4 tells |
| **Some tells** | 1-2 noticeable |
| **Mostly clean** | subtle issues only |
| **No AI tells** | distinctive, intentional design |

---

## Severity Definitions

| Severity | Definition | When to Fix |
|----------|------------|-------------|
| **P0 — Blocking** | Prevents task completion, data loss possible | Before any release |
| **P1 — Major** | Significant difficulty, WCAG AA violation | Before public release |
| **P2 — Minor** | Minor annoyance, workaround exists | Next release cycle |
| **P3 — Polish** | Nice-to-have, no real user impact | If time permits |

---

## Design Context Gathering Protocol

Before running audit or critique:

1. **Identify the interface type**: What is this interface trying to accomplish?
2. **Determine the audience**: Who will use this?
3. **Understand the brand**: What's the intended feel/tone?
4. **Check for existing design system**: Tokens, patterns, documentation
5. **Note technical constraints**: Platform, browser support, performance budget