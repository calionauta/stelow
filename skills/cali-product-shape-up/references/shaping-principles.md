---
source: stelow (consolidated)
original_files: core-principles.md, shaping-principles.md
date: 2026-05-15
---

# Shape Up — Core & Shaping Principles

## Core Principles

All shaping should prioritize:
- **KISS** — Keep It Simple, Stupid
- **DRY** — Don't Repeat Yourself
- **Progressive disclosure** — simple by default, complexity on demand
- **Convention over configuration** — sensible defaults, standard names
- **Delivery realism** — focus on what's achievable
- **Asymmetric risk reduction** — reduce biggest risks first
- **Focused scope** — less is more
- **Sustainable complexity** — complexity must be justified

Avoid:
- speculative over-engineering
- vague MVPs
- uncontrolled extensibility
- "platform thinking" too early
- feature soup

---

## Shaping Principles

Prioritize:
- KISS
- DRY
- progressive disclosure
- delivery realism
- asymmetric risk reduction
- focused scope
- sustainable complexity

Avoid:
- speculative over-engineering
- premature extensibility
- uncontrolled platformization
- vague scope
- feature soup

---

### ⚡ Estimation Bias Correction

"Delivery realism" and "focus on what's achievable" **do not mean**
cutting quality out of fear of complexity. Language models
systematically overestimate implementation time (bias from human
training data).

- **Sustainable complexity** means complexity must be
  justified — not that it should be avoided at all costs.
- If something seems "too complex" to the model, it should:
  1. Distrust its own bias
  2. Justify why it thinks it's complex
  3. Present an alternative without assuming the estimate is correct
- The decision on what is "achievable" is **human**, not the model's.

### Good shaping:
- creates tension-aware trade-offs
- intentionally excludes things
- preserves optionality where useful
- reduces downstream ambiguity
Avoid:
- feature soup
