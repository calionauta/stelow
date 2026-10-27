# Prompt 2: Thinking Styles — Indi Young

**Source:** https://calionauta.substack.com/p/prompt-ia-thinking-styles-indi-young

**When to use:** to separate performers by how they think about the same purpose.
Behavior and cognition, not demographics.

**Variables:**
- `{{Purpose}}`: what the performer is trying to achieve
- `{{Performer}}`: the group
- `{{Depth}}`: `quick` 3–4 styles | `standard` 4–6 | `deep` 5–7

**Read first:** `00-evidence-policy.md`.

---

## Research guardrail

Do not use research to infer someone's inner thoughts, emotions or personal
rules. Research may surface candidate language. Every thinking style stays a
hypothesis until an interview supports it.

Every `Voice example` carries a `Source & status`. A simulated voice is
illustrative, never a quote from a person.

**When the user supplied no interview or notes**, the output opens with the
hypothesis-mode banner and every row is `Hypothesis — bet`.

---

## Prompt

```
{{Purpose}}:
{{Performer}}:
Depth: {{Depth}}

Identify the significantly different thinking styles of {{Performer}} when trying
to {{Purpose}}: inner thinking, emotional reactions, and personal rules (habits,
customs, intentions) in the context of the purpose.

Thinking style: a pattern of behavior and cognition influenced by context and
purpose. Contextual and mutable, unlike an archetype.

## How many

Between 3 and 7, at the depth band. The number is a finding, not a target:
if two candidates would think and act the same way, merge them and say so.
Justify the final number, and justify any pair you considered merging.

## For each style

## {Name} — verb first, short
| Element | Description | Voice example | Source & status |
|---|---|---|---|
| Thought | inner thinking about the purpose | "..." | {status} |
| Emotion | emotional reaction while pursuing it | "..." | {status} |
| Personal Rule | habit, custom or principle | "I always/never..." | {status} |

- **Warrant:** the fragment of the purpose or of the supplied material this
  style follows from. Without one, this style is `Hypothesis — bet` and says so.
- Brief description (one line).
- Context.
- How it differs from the others, and how a solution would adapt.
- Top 3 functional jobs, top 2 emotional jobs, top 2 social jobs.

## Closing
- Por que {n} estilos, e não {n-1} nem {n+1}.
- Pares que quase se fundiram: {pair} — {why kept apart, or merged}.
```

## Completeness contract

- Between 3 and 7 styles, inside the depth band.
- Every style carries the three-row table with `Voice example` and
  `Source & status`, plus warrant, description, context, differentiation and the
  3/2/2 job lists.
- A closing that justifies the number and the near-merges.
- With no supplied material: hypothesis-mode banner at the top, all rows
  `Hypothesis — bet`.

criteria:
  - id: style-count
    kind: count
    text: "3 to 7 styles, inside the depth band"
  - id: style-fields
    kind: presence
    text: "Every style carries table, warrant, description, context, differentiation, 3/2/2 jobs"
  - id: style-distinctness
    kind: semantic
    text: "Styles are incompatible ways of thinking, not one person relabeled; near-merges are named"

*Synthetic — not evidence.*
