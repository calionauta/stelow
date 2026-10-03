# Required Output Structure

For EACH generated direction, generate:

## 0. Construction Pattern Declaration

Must be the first section, before any structural description:

```markdown
**Construction Pattern:** [Layered / Event-driven / Pipeline / Modular monolith / Serverless / Single store / ...]
**Implication:** [How this pattern shapes responsibility split — 1-2 sentences]
**Structure Choice:** [How the structure is *consequence* of the pattern, not a default]
```

---

## 1. Philosophy and Construction Guidelines

Explain:
- construction philosophy
- responsibility philosophy (who owns what)
- intended operator feeling
- strategic rationale

---

## 2. Components and Construction Flow

Include:
- components and their responsibilities
- primary construction flow (how a request or change travels)
- data ownership and contract shapes
- state, failure modes, and feedback
- rollout and migration philosophy
- reversibility notes (what is cheap to undo, what locks in)

---

## 3. Main Structure Sketch (ASCII)

Provide a simple ASCII component diagram.

The goal is clarity, not visual perfection.

---

## 4. Construction Flow (ASCII)

Provide an ASCII flow diagram covering:
- primary build/change flow
- key transitions
- important system responses and failure paths

---

## 5. Trade-Off Analysis

Include:
- pros
- cons
- implementation effort
- scalability implications
- maintainability considerations
- reversibility cost

End with a recommended direction and reasons — not a list of pros and cons.

---

## 6. Risk and Unknowns Audit

Self-audit declaring which risks this direction accepts:

```markdown
- ✅ / ⚠️ / ❌ [Risk name] — [reason / mitigation]
```

---

## 7. Scope Compatibility Table

Map each committed scope to how this direction serves it:

| Scope | Served by | Notes / friction |
|---|---|---|

Unmapped scopes must be named explicitly instead of silently absorbed.
