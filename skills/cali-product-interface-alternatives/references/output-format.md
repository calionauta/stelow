# Required Output Structure

For EACH proposal (A–E), generate:

## 0. Work Pattern Declaration

Must be the first section, before philosophy or any visual description:

```markdown
**Work Pattern:** [Monitor / Operate / Compare / Configure / Learn / Decide / Explore]
**Implication:** [How this pattern shapes spatial composition — 1-2 sentences]
**Layout Choice:** [How the layout is *consequence* of the work pattern, not a default]
```

---

## 1. Philosophy and Design Guidelines

Explain:
- design philosophy
- interaction philosophy
- intended user feeling
- strategic rationale

---

## 2. Breadboarding and Interaction Guidelines

Include:
- interface ingredients/components
- primary interaction loop
- navigation model
- states and feedback
- information density
- copy/tone guidance

---

## 3. Main Interface Sketch (ASCII)

Provide a simple ASCII wireframe.

The goal is clarity, not visual perfection.

---

## 4. Interaction Flow (ASCII)

Provide an ASCII flow diagram covering:
- primary user flow
- key transitions
- important system responses

---

## 5. Trade-Off Analysis

Include:
- pros
- cons
- development effort
- usability risk
- scalability implications
- maintainability considerations

---

## 6. Design Smell Audit

Self-audit declaring which design smells this proposal actively avoids.
See `interface-rules.md` for the full list of 10 smells.

### Format:
```markdown
- ✅ / ⚠️ / ❌ [Smell name] — [reason / mitigation]
```

---

## 7. State Coverage Table

Table showing interaction states covered per key component.

Each component must be typed as **Interactive** (`Int`) or **Display** (`Disp`).
Coverage is calculated as `(✅ + ⬆️) / (✅ + ❌ + ⬆️)` — N/A cells are excluded from both numerator and denominator.
Interactive components should aim for ≥6 applicable states.

### Format:
| Component | Type | Idle | Hov | Act | Foc | Dis | Ld | Emp | Err | Ovr | Coverage | vs Baseline |
|-----------|------|:---:+|:---:+|:---:+|:---:+|:---:+|:---:+|:---:+|:---:+|:---:+|:--------:+|:----------:|
| Example Btn | Int | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ | N/A |  6/6  |  ✅ ≥6  |
| Page Title | Disp | ✅ | N/A | N/A | ✅ | N/A | N/A | N/A | N/A | N/A |  2/2  |    —    |

### N/A Rules

| Cell | Meaning |
|------|---------|
| ✅ | Applicable AND implemented |
| ❌ | Applicable BUT NOT implemented — gap |
| N/A | Not applicable to this component type |
| ⬆️ ^X | Inherited from parent system or context (counts toward coverage) |

Coverage = `(✅ + ⬆️) / (✅ + ❌ + ⬆️)` — N/A is excluded.
