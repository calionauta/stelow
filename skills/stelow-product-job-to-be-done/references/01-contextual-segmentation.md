# Prompt 1: Contextual Segmentation

**Source:** https://calionauta.substack.com/p/prompt-ia-segmentacao-por-contexto

**When to use:** to cut a market into groups that differ by *situation*, not by
demographics. First step when the user does not know who to serve.

**Variables:** `{{Market or job}}`, `{{Depth}}` (`quick` 4–6 final segments,
`standard` 6–8, `deep` 8–10).

**Read first:** `00-evidence-policy.md`.

---

## Prompt

```
Goal: contextual segments for a job.

Job to be done: {{Market or job}}
Depth: {{Depth}}

## Process

1. List 20 candidate segments. Name only — one line each, no data.
2. Group or filter them into the depth's final count. The groups must be
   mutually exclusive, collectively exhaustive and non-redundant, and the cut is
   situational: same job, different circumstance.
3. Prioritize (do not discard) with the table below.
4. Show the disposition of the 20 candidates.
5. Show the final segments.

## What is forbidden

Demographics, unless there is no other way and you say why: age, gender, income,
education, occupation, marital status, family size, location, ethnicity,
religion, company size, industry, revenue, headcount, growth stage, business
type, technology, role title, purchase volume.

## Priority criteria

Higher is better, except Frequency and Barrier to Entry, where it depends on the
model.

| Criterion | Means |
|---|---|
| Impact | how much the context changes the job |
| Demand | how many people perform the job in that context |
| Effort | how hard the job is in that context |
| Purchasing power | ability to pay for a solution |
| Ease of reach | how findable the group is |
| Frequency | how often the job happens |
| Barrier to entry | restrictions on new entrants |

## Market statement

`{people} trying to {job, verb first} {context}`

The people go before the verb; the context after the object. Never two groups
before the verb.

- Job "manage finances together", group "family members with an elderly parent"
  → "family members trying to manage finances together with their elderly parent".
- Wrong: "people who care for elderly parents trying to manage finances together".

## Output

## {Segment name}

- **Status:** `Input-derived` | `Inference — high confidence` | `Hypothesis — bet`
- **Market:** {people} trying to {job} {context}
- **Justification:** the factor that separates this group from the others, in one
  sentence.
- **Situational factors:** the key factors and variables, and how they interact.
- **Scene:** one sentence, present tense, who/when/where — concrete enough that the
  reader recognises a Tuesday.
- **Observable difference:** what this group does today that the others do not. A
  behaviour, not a need.
- **Cost of failure:** what happens to them when the job fails.

## Disposition of the candidates

| Candidate | Disposition | Why |
|---|---|---|
| ... | kept / merged into X / dropped | one line |

## Closing

- Segmento que mais muda a decisão: {name} — {why}
- Segmento que você suspeita ser o maior e não conseguiu decidir: {name} — {what
  would settle it}
```

## Why there are no desired outcomes here

`Desired Outcomes` and `Constraints` per segment were removed on purpose. They are
Prompt 7's artifact, at a lower quality and without the situational input, and
they were the main reason a segment grew six fields without becoming clearer.
If the user needs the needs of a segment, run Prompt 7 with that segment.

## Completeness contract

- 20 candidates listed, with a disposition row for each.
- Final count inside the depth band.
- Every segment carries all seven fields above.
- No demographic cut unless justified.

criteria:
  - id: candidate-count
    kind: count
    text: "20 candidate segments listed, each with a disposition row"
  - id: final-count
    kind: count
    text: "Final segments inside the depth band"
  - id: segment-fields
    kind: presence
    text: "Every segment carries Status, Market, Justification, factors, Scene, Observable difference, Cost of failure"
  - id: segment-specificity
    kind: semantic
    text: "Segments name concrete situations and actors, not demographics"
  - id: scene-concreteness
    kind: semantic
    text: "Scene is a present-tense scene, not a category description"

*Synthetic — not evidence.*
