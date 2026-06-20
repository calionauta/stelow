---
source: stelow (consolidated)
original_files: checklist-flows.md, checklist-states.md, checklist-affordances.md, checklist-data.md, checklist-system.md, checklist-feasibility.md
date: 2026-05-15
applies_to: [plan, codebase]
---

# Product Critique — All Checklists

## 1. Checklist: Flows

Analyze user/data flows for completeness and coherence.

### Questions to ask:
- Is the primary flow clear and linear?
- Are all branching paths (conditionals) defined?
- Can users get stuck in dead ends?
- Are there loops that need exit conditions?
- Do parallel flows sync properly?
- Are rollback/undo paths defined?

### Check for:
- [ ] Primary flow is clear
- [ ] Alternative flows are defined
- [ ] Error paths are specified
- [ ] Back/undo navigation works
- [ ] Confirmation points exist for destructive actions
- [ ] Progress indicators for long operations

---

## 2. Checklist: States

Define and verify all possible states.

### Required states per component/feature:
- **Empty** — no data, no content, first-time experience (empty state)
- **Loading** — fetching, processing, async operations
- **Partial** — some data loaded, more pending
- **Populated** — has data/content
- **Error** — failed to load, connection issues, validation errors
- **Boundary** — max items, overflow, very long content
- **Edge** — first item, last item, single item, two items

### For each state, verify:
- [ ] Visual representation exists
- [ ] Appropriate messaging/labels
- [ ] User knows what to do next
- [ ] Recovery path is clear

### Interaction States (distinct from data/domain states)

State coverage per interactive component is the single most quantitative proxy for UI quality:
- **Human-designed baseline:** 7–9 interaction states per component
- **Typical AI-generated baseline:** 1–2 states (idle, maybe hover)
- **Target:** ≥6 states per interactive component

#### Required interaction states per component:

| State | Description |
|-------|-------------|
| **Idle** | Default rest state of the component |
| **Hover** | Visual feedback on pointer hover (where interactive) |
| **Active/Pressed** | Momentary feedback on press/click |
| **Focus** | Visible focus indicator for keyboard navigation |
| **Disabled** | Visually distinct non-interactive state with clear reasoning (e.g. missing permission, unmet conditions) |
| **Loading** | Per-component loading/processing indicator (not just page-level spinner) |
| **Empty** | Meaningful empty state with guidance for what to do next (not just blank or "no data") |
| **Error** | Per-component validation or system error with clear recovery path |
| **Overflow** | Content exceeds container bounds — handles truncation, scroll, or expansion gracefully |

### Component Typing for State Review

Every component must be classified:

| Type | Label | Baseline applies? | Examples |
|------|-------|:-----------------:|----------|
| **Interactive** | `Int` | ✅ ≥6 applicable states | Buttons, inputs, switches, links, clickable cards |
| **Display** | `Disp` | ❌ visual-only | Headings, separators, decorative illustrations, static badges, text blocks |

### N/A Semantics for State Audit

| Cell | Meaning |
|------|---------|
| ✅ | Applicable AND implemented |
| ❌ | Applicable BUT NOT implemented — gap |
| N/A | Not applicable to this component type (excluded from coverage)* |
| ⬆️ ^X | Inherited from parent system (counts toward coverage) |

Coverage formula: `(✅ + ⬆️) / (✅ + ❌ + ⬆️)` — N/A cells are excluded from both numerator and denominator.
Count is over applicable cells only: if a component has 5 ✅ + 1 ❌ + 3 N/A, coverage = (5+0)/(5+1+0) = 5/6.

\*Display components: typically Idle ± Focus, rest N/A. Interactive components carry burden of proof for N/A.

### Check for (interaction states):
- [ ] Each interactive component covers ≥6 *applicable* states on average
- [ ] Display components are only marked for applicable states (Idle, Focus) — not faking states
- [ ] Component classification (Int vs Disp) is accurate, not inflated or deflated
- [ ] N/A usage is honest: toggle switches don't have Loading (N/A), but inputs do (❌ if missing)
- [ ] Coverage consistency: if all Interactive components show 100% (e.g. 8/8, 9/9), actively question N/A inflation
- [ ] ⬆️ inheritance is verifiable (named source exists, e.g. ^DS, not a blank ^)
- [ ] Disabled states have a clear reason (tooltip, hint, label)
- [ ] Loading states are per-component, not just page-level
- [ ] Empty states provide guidance, not just "nothing here"
- [ ] Error states provide actionable recovery, not just "something went wrong"
- [ ] Focus states are visible and meet WCAG 2.2 focus appearance (minimum 2px outline, contrast ratio ≥3:1)
- [ ] Overflow is handled gracefully (truncation with affordance, or scroll, or expand/collapse)

### Quantitative consistency checks for the reviewer:
- [ ] Coverage scores are plausible — if all components score ≥90%, check for N/A inflation
- [ ] Display components have no more than 2-3 non-N/A cells (Idle ± Focus); if more, they may be misclassified as Int
- [ ] N/A counts per Interactive component are ≤1 without a justification note
- [ ] ⬆️ inheritance sources are named and verifiable, not blanket ^DS

---

## 3. Checklist: Affordances & Interactions

Verify that interactive elements are discoverable and behave predictably.

### Check for:
- [ ] Buttons look like buttons (visual affordance)
- [ ] Links look like links (underline, color)
- [ ] Clickable elements have hover/focus states
- [ ] Drag targets are obvious
- [ ] Touch targets are ≥44x44px
- [ ] Disabled states are visually distinct
- [ ] Loading states disable interaction appropriately

### Interaction patterns:
- [ ] Click = immediate feedback (visual change)
- [ ] Double-click is not required
- [ ] Long-press is documented (mobile)
- [ ] Swipe gestures are discoverable
- [ ] Keyboard navigation works
- [ ] Tab order is logical

### Design Quality — Anti-Pattern Checklist

The failure distribution of AI-generated UI is narrow: ~10 patterns account for ~90% of the "looks AI-generated" signal.
Each item below catches one of those common tells.

#### Anti-pattern checks:
- [ ] **No gratuitous tech gradient** — avoids blue-violet glossy gradients unless backed by a meaningful depth/elevation system
- [ ] **Intentional hue selection** — color palette is chosen for brand, emotion, or accessibility reasons, not defaulting to indigo "because software"
- [ ] **Feature tiles have prioritization** — icon + heading + sentence blocks are staggered, sized, or weighted by importance; not all equal visual weight
- [ ] **Cards use genuine organization, not decoration** — grouping, nesting, or data relationships inform card structure; accent rails or colored edges are not used as fake organization
- [ ] **Blur/glassmorphism is earned** — blur effects are backed by a coherent depth system (layered elevation, occlusion, or parallax), not applied as unearned decoration
- [ ] **Stats tell a story** — numbers are presented with narrative context, not as oversized figure-elements filling space
- [ ] **Icons are functional, not template filler** — icons serve a communicative purpose; they are not mechanically placed above every heading block
- [ ] **Motion is purposeful** — easing curves and animations are chosen for function (attention direction, spatial understanding, state transition), not because "the API has bounce"
- [ ] **Typography is intentional** — font choices are driven by readability, brand voice, and surface purpose; not the default training-distribution font
- [ ] **Layout reflects a composition decision** — layout is not centered-by-default; alignment and positioning are a deliberate choice based on the work pattern the surface serves

#### Scoring (smells present, not avoided):
| Smells present | Meaning |
|:--------------:|---------|
| 0 | No AI slop — distinctive, intentional design ✅ |
| 1–2 | Mostly clean — subtle issues only 🔎 |
| 3–4 | Some tells — noticeable AI aesthetic 🤔 |
| 5+ | AI slop gallery — heavy redesign recommended 🚨 |

> **Smell clustering note:** Tech gradient, stat monument, and center stack co-occur in ~60% of AI-generated landing pages. If you detect one, actively check for the other two — they are likely present. Bounce everywhere and default type also cluster frequently.

---

## 4. Checklist: Data

Verify data handling is complete and consistent.

### Data requirements:
- [ ] Required vs optional fields are explicit
- [ ] Data types are defined (string, number, date, etc.)
- [ ] Validation rules are specified
- [ ] Default values are defined
- [ ] Empty/null handling is clear
- [ ] Data persistence (session, localStorage, database)

### Data integrity:
- [ ] Duplicate detection rules
- [ ] Conflict resolution strategy
- [ ] Data migration path
- [ ] Backup/recovery plan
- [ ] Data retention policy

---

## 5. Checklist: System

Verify system integration and error handling.

### External dependencies:
- [ ] API contracts are defined
- [ ] Error codes are documented
- [ ] Timeout behavior is specified
- [ ] Retry logic is defined
- [ ] Fallback behavior exists
- [ ] Rate limiting is considered
- [ ] Offline behavior is defined

### Monitoring & observability:
- [ ] Key metrics are tracked
- [ ] Error reporting exists
- [ ] Audit logging is in place
- [ ] Performance metrics are defined

---

## 6. Checklist: Feasibility

Verify the proposal is technically achievable.

### Technical feasibility:
- [ ] Architecture supports the requirement
- [ ] Technology stack is adequate
- [ ] Third-party services are available
- [ ] Security requirements are achievable
- [ ] Performance targets are realistic

### Risk assessment:
- [ ] Unknowns are identified as spikes
- [ ] Technical risks are documented
- [ ] Integration complexity is estimated
- [ ] Testing strategy is defined

### Effort estimation:
- [ ] Scope is bounded
- [ ] Dependencies are identified
- [ ] Resources are available
- [ ] Timeline is realistic

### Scope Fit (appetite_fit):
- [ ] Scope count matches declared appetite: Lean ≤ 2, Core ≤ 5, Complete ≤ 15
- [ ] Spec depth matches appetite (spec size, edge case coverage)
- [ ] Interface exploration depth matches appetite (1/3/5 proposals)
- [ ] If appetite ≠ fits, specific cuts identified or reshape recommended
- [ ] Appetite boundary is not extended — cuts are proposed instead

---

## 7. Checklist: Compositional Quality (Purpose-Layout Alignment)

Verify that the spatial composition matches the work pattern the surface serves.
This catches the most fundamental AI-generated design failure: choosing layout before choosing purpose.

### The 7 Work Patterns

| Pattern | Surface Type | Core Purpose | Correct Spatial Composition |
|---------|-------------|--------------|----------------------------|
| **Monitor** | Dashboards, status boards, alerts, metrics | Overview & vigilance at a glance | Data-dense, scan-friendly, information radiators, priority through position + color coding |
| **Operate** | Command bars, canvases, inspectors, tools | Act on objects with precision | Tool-anchored, minimal chrome, maximize work area, palettes in secondary zones |
| **Compare** | Tables, matrices, split views, diff viewers | Find differences & patterns | Side-by-side, consistent columns, highlight deltas, minimal decoration |
| **Configure** | Settings, forms, wizards, previews | Set up and verify before committing | Progressive disclosure, preview alongside controls, clear commit point |
| **Learn** | Articles, walkthroughs, tutorials | Guide comprehension step by step | Reading rhythm (65–75ch measure), narrative hierarchy, minimal distraction |
| **Decide** | Landing pages, purchase flows, pitch pages | Drive one clear action | Focused hero, one dominant CTA, proof elements as supporting cast |
| **Explore** | Search, maps, galleries, discovery feeds | Find something through iteration | Faceted filters, forgiving (OR over AND), preview-rich, reversible |

### Check for:
- [ ] The surface has an identifiable work pattern (not generic "it's a UI")
- [ ] The spatial composition matches the work pattern (e.g. Monitor uses scan-density, not centered hero)
- [ ] Layout choices are justified by purpose, not by default (center-stack, cards-in-grid)
- [ ] The composition does NOT contradict the work pattern:

| Work Pattern | Contradicted by | Why |
|-------------|-----------------|-----|
| Monitor | Centered hero + cards | Monitor needs scan density, not funnel focus |
| Operate | Long sequential wizard | Operate needs direct manipulation, not step-by-step commit |
| Explore | Static pitch page | Explore needs reversibility and iteration |
| Decide | Dense data table | Decide needs low cognitive load, not analysis |
| Compare | Single-column narrative flow | Compare needs side-by-side, not linear |
| Configure | Dashboard widgets | Configure needs progressive disclosure, not overview |
| Learn | Command palette + canvas | Learn needs narrative rhythm, not tool-first |

- [ ] If the surface serves multiple work patterns, there is a clear primary pattern and secondary zones respect that hierarchy
- [ ] The density strategy (sparse vs dense) matches the pattern (e.g. sparse works for Decide, not for Monitor)