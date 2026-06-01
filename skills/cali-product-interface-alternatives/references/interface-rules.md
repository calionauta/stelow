---
source: cali-product-workflow (consolidated)
original_files: separation-rule.md, tradeoff-rule.md, output-expectations.md
date: 2026-05-15
---

# Interface Alternatives — Rules & Expectations

## Design Taste as a System: Rationale

This approach treats design taste as a **named system**, not intuition:

- **Named patterns** (7 Work Patterns) — reduce the layout space from "infinite" to 7 purposeful families
- **Named smells** (10 Design Smells) — give the model vocabulary for *what not to do*
- **Named states** (9 Interaction States) — provide a quantitative baseline for interaction quality

> *A designer who can name 10 smells can see them. An LLM that can't name them will keep generating them.*

The act of naming and checking anti-patterns changes output quality *before* any visual tokens are generated — because the model now has vocabulary for what to avoid and a system for why.

**Canonical source:** `skills/cali-product-ux-critique/references/ui-audit-dimensions.md` contains the 14-tell AI Slop Detection audit (superset of the 10 smells here, plus gradient text, nested cards, gray-on-color, and redundant microcopy). Cross-reference when doing post-generation audit.

---

## Proposal Separation Rule

Each proposal must differ in at least **TWO** of the following:

- interaction model
- navigation structure
- information architecture
- primary metaphor
- user agency model
- density strategy
- feedback model
- temporal flow
- command structure

**Do not generate proposals that differ only visually or cosmetically.**

---

## Work-Pattern-First Composition

Before any visual property is defined, each proposal must identify which of the 7 work patterns the surface serves. The work pattern determines the fundamental spatial composition — layout is a consequence of purpose, not an aesthetic choice.

This is chain-of-thought for design: forcing the model to reason about the **purpose of the layout** before generating tokens within that layout reduces entropy and eliminates generic compositions.

### The 7 Work Patterns

| Pattern | Surface Type | Core Purpose | Spatial Composition |
|---------|-------------|--------------|-------------------|
| **Monitor** | Status boards, dashboards, alerts, metrics, live feeds | Overview & vigilance at a glance | Data-dense, scan-friendly, information radiators, priority through position + color coding |
| **Operate** | Command bars, canvases, inspectors, direct manipulation tools | Act on objects with precision | Tool-anchored, minimal navigation chrome, maximize work area, palettes/inspectors as secondary zones |
| **Compare** | Tables, matrices, split views, ranked lists, diff viewers | Find differences & patterns among similar items | Side-by-side or scroll-sync layouts, consistent column widths, highlight deltas, minimize decorative elements |
| **Configure** | Grouped settings, forms, wizards, previews, commit areas | Set up and verify before committing | Progressive disclosure, preview alongside controls, clear commit point, breadcrumb/tab navigation for depth |
| **Learn** | Article flows, walkthroughs, tutorials, progressive sections | Guide comprehension step by step | Reading-rhythm layout (65–75ch measure), clear narrative hierarchy, progressive reveal, minimal peripheral distraction |
| **Decide** | Landing pages, purchase flows, sign-up, pitch pages, one-action surfaces | Reduce risk, build trust, drive one clear action | Focused hero, one dominant call-to-action, proof elements (testimonials, stats) as supporting cast, linear visual hierarchy toward the action |
| **Explore** | Search interfaces, filterable maps, galleries, discovery feeds, browse | Find something unknown through iteration | Faceted navigation, forgiving filters (OR over AND), preview-rich results, reversible actions, minimize dead ends |

### Rule

Each proposal must open with:

```markdown
**Work Pattern:** [Monitor | Operate | Compare | Configure | Learn | Decide | Explore]
**Implication:** [1-2 sentence explanation of how this pattern shapes spatial composition]
```

**Example:**
```markdown
**Work Pattern:** Decide
**Implication:** Layout must funnel attention to one dominant action (CTA). Proof elements (testimonials, metrics) support the decision, not compete. Centered hero + single call-to-action is structurally appropriate here — but only because the surface is a Decide pattern, not a Monitor or Explore pattern.
```

### Multi-Work-Pattern Surfaces

Some interfaces legitimately serve multiple work patterns (e.g. a dashboard that is primarily **Monitor** but has a **Configure** panel for settings). For these:

1. **Declare a primary pattern** — the dominant purpose that shapes the overall composition
2. **Secondary zones respect the primary** — layout zones for secondary patterns are subordinate in visual weight, position, or size
3. **Mark them explicitly:**

```markdown
**Primary Work Pattern:** Monitor
**Secondary Work Pattern:** Configure
**Hierarchy:** The information-dense Monitor grid occupies 75% of the viewport. The Configure panel is a collapsible side drawer — accessible when needed, out of the way when not.
```

### Unusual or Hybrid Surfaces

If no single work pattern fits perfectly, note the closest pattern and explain the deviation:
```markdown
**Work Pattern:** Approximates Explore, but with strong Configure characteristics
**Hybrid Rationale:** This is an admin panel for filtering user data (Explore) with bulk-edit capabilities (Configure). The layout prioritizes Explore's facet navigation in the main zone, with Configure's progressive disclosure reserved for the selection-action cycle.
```

### Audit: Work Pattern vs Layout Alignment

If a proposal's layout contradicts its declared work pattern, that is a **compositional gap**:

| Work Pattern | Would be wrong as | Because |
|-------------|-------------------|---------|
| Monitor | Centered hero + cards | Monitor needs scan density, not funnel focus |
| Operate | Long form with wizard steps | Operate needs direct manipulation, not sequential commit |
| Compare | Single-column narrative flow | Compare needs side-by-side, consistent columns, not linear reading |
| Configure | Dashboard overview widgets | Configure needs progressive disclosure and preview, not dense overview |
| Learn | Command palette + canvas | Learn needs narrative rhythm and reading measure, not tool-first layout |
| Decide | Dense data table | Decide needs minimal cognitive load, not analysis paralysis |
| Explore | Static pitch page | Explore needs reversibility and iteration, not a linear sales argument |

---

## Forced Trade-Off Rule

Each proposal must **intentionally sacrifice something** to optimize another dimension.

### Examples:
- simplicity over flexibility
- automation over control
- speed over discoverability
- familiarity over differentiation
- density over approachability

**Avoid "best of all worlds" proposals.**

---

## Smell Self-Audit

Each proposal must include a self-audit declaring which design smells it actively avoids.

The failure distribution of AI-generated design is narrow (~10 patterns account for ~90% of the "looks like AI" signal). Proposals that explicitly name their anti-patterns produce better, more deliberate design.

### The 10 Design Smells

| # | Smell | Description | Anti-Pattern Check |
|---|-------|-------------|--------------------|
| 1 | **Tech gradient** | Blue-violet glossy energy on everything without depth purpose | [ ] Avoids gratuitous blue-violet gradients; uses color intentionally for hierarchy |
| 2 | **Generic tech hue** | Indigo "because software" — not purple, *indigo* | [ ] Hue is chosen for an explicit reason (brand, emotion, accessibility), not default indigo |
| 3 | **Feature tile grid** | Icon + heading + sentence × N, all equal weight, nothing prioritized | [ ] Feature tiles have clear visual hierarchy and prioritization; not all equal weight |
| 4 | **Accent rail** | Colored stripe on card edge = decoration pretending to be organization | [ ] Cards use genuine organizational structure (grouping, nesting, data relationships) |
| 5 | **Unearned blur** | Glassmorphism without a depth system | [ ] Blur/glassmorphism is backed by a coherent depth system (layers, elevation, occlusion) |
| 6 | **Stat monument** | Oversized numbers filling space where a product story belongs | [ ] Numbers are presented in context with narrative, not as empty visual filler |
| 7 | **Icon topper** | Rounded-square icon above every heading as template filler | [ ] Icons are functional and intentional, not mechanical filler above every block |
| 8 | **Bounce everywhere** | Elastic easing because the API has it, not because it's purposeful | [ ] Motion is purposeful and selective; easing serves function, not API availability |
| 9 | **Default type** | Whatever font the training distribution likes this year | [ ] Typography is intentional — chosen for readability, brand, and surface purpose |
| 10 | **Center stack** | Everything centered because no composition decision was made | [ ] Layout composition is a deliberate choice driven by work-pattern, not center-stack default |

### Audit format (include at end of each proposal)

```markdown
### Design Smell Audit
- ✅ Avoids tech gradient — color is functional (status/alert semantics)
- ✅ Avoids generic tech hue — uses brand palette with accessibility contrast
- ✅ Avoids feature tile grid — uses staggered card sizes with priority tiers
- ⚠️ Accent rail — used intentionally on the primary CTA card to distinguish from secondary cards; mitigated by semantic color (green, not decorative indigo)
- ❌ Bounce everywhere — partially present; easing is used on modal transitions but could be more selective; consider reducing to slide+fade only
```

**Intentional smell rule:** A smell is only acceptable if the proposal provides an explicit justification explaining *why* the pattern serves a functional purpose in this specific context, not just "it looks good." If the justification is cosmetic, the smell remains a ❌.

### Proposals should score themselves against this table:

| Score (avoided) | Maps to (present tells) | Meaning |
|:---------------:|:----------------------:|---------|
| 8-10 avoided | 0-2 tells | Deliberate design — minimal AI tells |
| 5-7 avoided | 3-5 tells | Mixed — some intentional choices, some defaults |
| 3-4 avoided | 6-7 tells | Noticeable AI signal — rework recommended |
| 0-2 avoided | 8-10 tells | Heavy AI slop — major redesign needed |

> The same scale inverted is used in `checklists.md` and `ui-audit-dimensions.md` (present-count).

---

## State Coverage Baseline

Interaction state coverage is the most quantitative proxy for design quality.

- **Human-designed baseline:** 7–9 interaction states per component
- **AI-generated baseline (typical):** 1–2 states (idle, maybe hover)
- **Gap:** ~1 order of magnitude

### Required interaction states per component

| State | Description |
|-------|-------------|
| **Idle** | Default rest state of the component |
| **Hover** | Visual feedback on pointer hover (where interactive) |
| **Active/Pressed** | Momentary feedback on press/click |
| **Focus** | Visible focus indicator for keyboard navigation |
| **Disabled** | Visually distinct non-interactive state with reasoning (e.g. missing permission) |
| **Loading** | Per-component loading indicator, not just page-level spinner |
| **Empty** | Meaningful empty state with guidance (not just blank) |
| **Error** | Per-component validation or system error with recovery path |
| **Overflow** | Content exceeds container — handles truncation, scroll, or expansion |

### Component Typing

Every component in the state table must be typed as one of:

| Type | Label | Baseline applies? | Examples |
|------|-------|:-----------------:|----------|
| **Interactive** | `Int` | ✅ ≥6 applicable states | Buttons, inputs, switches, links, cards that are clickable |
| **Display** | `Disp` | ❌ (visual-only) | Headings, separators, decorative illustrations, static badges, text blocks |

**Interactive** = user can interact with it (click, tap, type, drag, select, focus).
**Display** = information-only; no interaction expected.

Misclassifying a Display component as Interactive (or vice versa) is a design flaw — if a heading needs hover/focus states, it should be interactive; if a card has no action, mark it Display and don't fake states.

### N/A Semantics

| Cell | Meaning |
|------|---------|
| ✅ | Applicable AND implemented |
| ❌ | Applicable BUT NOT implemented — gap |
| N/A | Not applicable to this component type (excluded from coverage) |
| ⬆️ ^X | Inherited from parent system (counts toward coverage) |

Coverage is calculated as `(✅ + ⬆️) / (✅ + ❌ + ⬆️)` — N/A cells are excluded from both numerator and denominator.

**Rule of thumb for applicability:**
- Display components: typically only Idle + Focus (if focusable). The rest are N/A.
- Interactive components: all 9 states are *potentially* applicable, but some may be N/A with justification (e.g. a toggle switch doesn't have Loading). The burden of proof is on N/A.

**N/A justification rule:** For any Interactive component with >1 N/A cell, include a `N/A Notes` section below the table explaining why each N/A is structurally inapplicable (not just unimplemented). Example:
```
N/A Notes:
- Search Input Overflow = N/A: truncation uses CSS text-overflow:ellipsis (browser default, not a designed component state)
- Action bar Empty/Overflow = N/A: static toolbar with fixed items, no dynamic content
```

### Proposals should include:

A state coverage table for key components showing states per type:

| Component | Type | Idle | Hov | Act | Foc | Dis | Ld | Emp | Err | Ovr | Coverage | vs Baseline |
|-----------|------|:---:+|:---:+|:---:+|:---:+|:---:+|:---:+|:---:+|:---:+|:---:+|:--------:+|:----------:|
| Primary Btn | Int | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ | N/A |  6/6  |  ✅ ≥6  |
| Search Input | Int | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  9/9  |  ✅ ≥6  |
| Data Table | Int | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |  9/9  |  ✅ ≥6  |
| Page Title | Disp | ✅ | N/A | N/A | ✅ | N/A | N/A | N/A | N/A | N/A |  2/2  |    —    |
| Separator | Disp | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |  1/1  |    —    |

**Aim for ≥6 applicable states per interactive component.** Proposals with <4 states per component on average are considered low-interaction-quality.

### Escape Hatches

**Non-interactive components (Display):** typed as `Disp`, listed in the table with applicable states only (typically Idle ± Focus). No baseline applies.

**Radical minimalism (Archetype D):** A proposal may deliberately choose <4 states for an interactive component as a trade-off for simplicity. If so, justify explicitly:
```
State Coverage Note: Archetype D opts for <4 states on [component] as a deliberate simplicity trade-off.
[Component] has only Idle + Hover + Pressed because [reason — e.g. "this is a single-use disposable action"];
all other interactive components meet the ≥6 baseline.
```

**State inheritance:** If a component inherits states from a parent design system (e.g. system tokens handle focus/disabled globally), mark with ⬆️ and note the inherited source rather than marking ❌. Inherited states count toward coverage:
| Action bar | Int | ✅ | ✅ | ✅ | ⬆️ ^DS | ✅ | N/A | N/A | ✅ | N/A |  6/6  |  ✅ ≥6  |

**Absent components:** If a surface has no component of a certain type (e.g. no table, no search), omit it from the table entirely rather than including a row with all N/A.

### Guardrails

#### Component selection (prevent arbitrary cherry-picking)

Include a **representative cross-section**:
- All distinct Interactive component types (button, input, table, dropdown, etc.)
- At minimum: primary action, secondary action, navigation element, search/input, data display, and any explicitly called-out component
- For repeated types (e.g. 30 form fields), use one representative row annotated with a count:
  `Form Input (×28) | Int | ✅ | ✅ | ✅ | ✅ | N/A | ✅ | ✅ | ✅ | ✅ |  7/8  |  ✅ ≥6  *`
  \*All 28 instances share the same state coverage; only one row is shown.
- Cap the table at ~12 rows. Beyond that, group by component class.

**Self-check before marking as Display:** Ask: *"Could a user interact with this component?"* If yes (click, tap, select, drag, focus), it is Interactive. Display is for decorative/purely semantic elements only.

#### Platform-aware state applicability

Hover does not apply on touch-only platforms; Focus behavior differs on mobile vs desktop. If the proposal targets multiple platforms:
- Add a **View** column to disambiguate: `| Component | Type | View | Idle | Hov | ... |`
- Or annotate platform differences in a footnote: `*Hover = N/A on mobile`
- Do not collapse platform-specific states into a single ambiguous row.

#### Baseline relaxation beyond Archetype D

The ≥6 baseline applies to **active, interactive surfaces**. The following are legitimate exceptions (no Archetype D justification required):
- **Read-only surfaces** (document viewer, archived content, static preview)
- **Kiosk/touch-only** (Hover may be N/A per platform, standard baseline reduced)
- **Voice/audio-first interfaces** (visual states replaced by audio cues)
- **Inherently simple Int components** (dismiss button, single-action badge) — each N/A must be justified per the N/A justification rule above

#### Self-audit before finalizing

Before submitting, verify:
1. Every Interactive N/A cell has a valid justification — if >1 N/A per component, include an `N/A Notes` section
2. Every ⬆️ source is named and traceable (e.g. ^DS, ^Base)
3. The Coverage column matches the formula `(✅ + ⬆️) / (✅ + ❌ + ⬆️)` — verify 2-3 rows manually
4. Display-classified components truly have no interaction — if a heading receives focus, it is Interactive

---

## Output Quality Expectations

### Strong outputs:
- reveal hidden assumptions
- explore genuinely different interaction models
- expose meaningful trade-offs
- create productive strategic tension
- help convergence, not only divergence

### Weak outputs:
- differ only cosmetically
- merely add/remove AI
- preserve identical architecture across proposals
- avoid difficult trade-offs
- collapse into generic SaaS dashboards

**The proposals should feel meaningfully different in philosophy, interaction model, and strategic intent.**