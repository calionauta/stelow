---
source: cali-product-planner (consolidated)
original_files: clarification.md, when-to-use.md, cross-domain-adaptability.md, d-vs-e.md
date: 2026-05-15
---

# Interface Brainstorming — Context & When to Use

## Progressive Clarification Principle

Prefer proceeding with explicit assumptions instead of blocking for additional information.

**Only ask follow-up questions when missing information would materially change:**
- interaction architecture
- platform strategy
- density strategy
- primary workflows
- accessibility constraints
- technical feasibility

If assumptions are made:
- state them explicitly
- continue with the exploration

**Avoid asking for:**
- restating already available context
- full specifications
- exhaustive requirements
- formal solution documents

---

## When to Use

### Use this skill when:
- designing new products or features with user-facing interfaces
- evaluating competing UI approaches or interaction models
- interface decisions are ambiguous (UX or system-level)
- exploring user flows, API contracts, or service interaction patterns
- translating product concepts into concrete interfaces (UI or system)
- frontend structure meaningfully affects product strategy
- designing system-to-system interfaces where contract philosophy matters

### Not just for UI/UX — the 5 archetypes map to system interfaces too:

| Archetype | System Equivalent |
|---|---|
| A (Conventional) | RESTful API conventions |
| B (Paradigm Shift) | Event-driven / GraphQL / streaming |
| C (Vanguard) | AI-powered endpoints / real-time sync |
| D (Radical Simplicity) | Minimal RPC / webhook-only |
| E (Expert) | CLI / SDK / power-user API |

---

## Difference Between D and E

**Proposal D** removes complexity to make the experience universally understandable.

**Proposal E** removes guidance, onboarding, and explanatory structure to maximize speed for experienced users.

**D** optimizes for clarity.

**E** optimizes for fluency.

They are not interchangeable.

---

## Cross-Domain Adaptability

Not just for UI/UX — the 5 archetypes map to system interfaces too:
- A (Conventional) → RESTful API conventions
- B (Paradigm Shift) → Event-driven / GraphQL / streaming
- C (Vanguard) → AI-powered endpoints / real-time sync
- D (Radical Simplicity) → Minimal RPC / webhook-only
- E (Expert) → CLI / SDK / power-user API