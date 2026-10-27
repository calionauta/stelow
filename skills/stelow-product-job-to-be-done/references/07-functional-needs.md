# Prompt 7: Functional Needs — `Ensure` / `Avoid` criteria

**Source:** https://calionauta.substack.com/p/prompt-ia-descoberta-de-necessidades

**When to use:** when the job and its steps exist, and the user needs to know what
"done well" means at each one. This is the criteria layer: measurable, solution
agnostic, ordered.

**Variables:** `{{Job or segment}}`, `{{Step}}` (optional), `{{Role}}`,
`{{Situational factors}}` from Prompt 6, `{{Depth}}` (5 / 10 / 10 criteria).

**Read first:** `00-evidence-policy.md`.

---

## Prompt

```
Job: {{Job or segment}}
Step: {{Step, or the whole job}}
Role: {{Role, or the beneficiary}}
Conditions: {{the three ranked factors from Prompt 6}}
Depth: {{Depth}}

Imagine you are the person in the Role, performing the Step, with those
conditions, first person singular.

Ask: "what needs to happen for me to succeed at this, given all of it?"

## Statement rules

- Starts with **Ensure** (what must happen) or **Avoid** (what must not).
- Measurable by three dimensions at once: **speed** (seconds), **ease** (number of
  actions and perceived effort), **result consistency** (proportion). A criterion
  that only measures one of the three is too narrow — find the outcome behind it.
- Functional: a result, not a feeling, not a perception, not a motivation.
- Solution agnostic. No product, platform, brand, technology or method, unless the
  job statement names one.
- No adjectives, no adverbs, no conjunctions.
- MECE: no criterion repeats another, and together they cover the job.
- Each criterion adds information beyond the job statement itself.

Correct: `Ensure uninterrupted music control despite sweaty or shaky hands`.
Incorrect: `Begin music playback immediately` — wrong verb, only speed, adjective.

## QA before publishing (do this, do not print it)

Rewrite each criterion with a different imperative verb. If the rewrite changes
the meaning, the criterion is malformed: fix it or discard it. The rewrite is a
test, not an artifact — it appears only as one short cell in the summary table.

## Prioritize

Composite score, 1–5 each:

- **R** risk of failure — how likely a current solution fails this criterion
- **P** performance gain — how much meeting it improves the job
- **H** harm of failure — how much failing it damages the job
- **Inc** result inconsistency — how hard it is to achieve consistently
- **Inv** investment — resources needed to meet it today

`Composite = (R + P + H) × (Inc + Inv)`

Every score carries a **Basis**: `evidência` | `pesquisa` | `inferência`. The
composite is a ranking heuristic over judgment. It orders work; it does not
estimate demand.

## Output

## Top criteria

#### 1/{N} {criterion statement}
- **Justification:** why this is still unsolved, and why it is not easy today
- **Score:** {composite} — **Basis:** {…} — {how each factor was rated}
- **Metrics:** {count, proportion or average; how to measure speed, ease and
  consistency for this criterion}
- **Current alternative:** {the type of solution people use today for THIS
  criterion — mental, physical, virtual, procedural}, plus one example brand when
  it is known, marked `candidate`. Prompt 4 maps the market; this names what
  solves *this criterion*, and one example makes the type concrete.

## Summary

| Criterion | Rewrite (QA check) |
|---|---|
| ... | ... |

## Closing
- O critério que o usuário não tinha visto: {criterion} — {why}
- O critério que parece óbvio e já está resolvido: {criterion} — {evidence}
```

## Why the rewrite is not a field

It is a guard against a malformed criterion, and guards belong in the process.
Printed per criterion it doubled the artifact and said the same thing twice. In
the summary table it stays auditable for one cell each.

## Why `Current alternative` is not Prompt 4

Prompt 4 answers "who competes for the job". This answers "what solves *this
criterion* today". Different altitude, different decision: Prompt 4 is
positioning, this one tells you whether the criterion is already solved.

## Completeness contract

- The depth's number of criteria, each with the four fields.
- Every score carries a `Basis`.
- The summary table holds one rewritten cell per criterion.
- No adjective, adverb or conjunction in any criterion.

criteria:
  - id: criteria-count
    kind: count
    text: "The depth's number of criteria, each under its own heading"
  - id: criterion-fields
    kind: presence
    text: "Every criterion carries Justification, Score with Basis, Metrics and Current alternative"
  - id: rewrite-table
    kind: presence
    text: "The summary table holds one rewritten variant per criterion"
  - id: metric-measurability
    kind: semantic
    text: "Metrics name observable measurements across speed, ease and consistency"

*Synthetic — not evidence.*
