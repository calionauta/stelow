# Prompt 6: Situational Variables

**Source:** https://calionauta.substack.com/p/prompt-ia-descoberta-de-variaveis

**When to use:** when the job is clear but the circumstances that change its
outcome are not. Feeds Prompt 7 with the conditions, and Prompt 10 with the
context of each step.

**Variables:** `{{Job}}`, optional `{{Segment}}`.

**Read first:** `00-evidence-policy.md`.

---

## Prompt

```
Job to be done: {{Job}}
Segment: {{Segment}}

Discover the situational factors that significantly change how this job is
performed.

## Categories

- **Where** — physical environment: location, conditions, available resources.
- **With whom & local culture** — presence and influence of other people, norms in
  the moment.
- **When** — moment, period, rhythm, deadline pressure.
- **Why** — the reason behind doing the job, the goal above it.
- **How** — internal state, in six parts: personal history (values, beliefs, past
  experience, ingrained habits); perception of the situation; emotional state;
  physiological and cognitive state; experience (knowledge and skills for this
  job); strategies and planning (what they do to reach the purpose).

For each category, list the factors that most change the outcome, and for each
factor the variables that matter, with a concrete example.

## Rules

- Specific and observable. No abstractions, no adjectives, no adverbs.
- Mutually exclusive, collectively non-redundant. Exhaustive is a direction, not
  a quota: a factor that changes nothing does not belong in the list.
- If the job is done for someone else, consider both perspectives.
- A factor without an example is a label. Either give the example or drop it.

## Output

## Where / With whom / When / Why / How

| Fator | Variável | Exemplo concreto | Status |
|---|---|---|---|

## O que mais muda o resultado

| # | Fator | Por que muda | 
|---|---|---|
| 1 | ... | ... |
| 2 | ... | ... |
| 3 | ... | ... |

## Closing
- O fator que o usuário não tinha considerado: {factor} — {why it matters}
- O fator que parece óbvio e não muda nada: {factor} — {why it can be dropped}
```

## Why the ranking is the artifact

The taxonomy is process. What Prompt 7 consumes, and what a person reads, is the
three factors that actually move the outcome. A list of forty variables with no
ranking is a worksheet, not a finding.

The full table stays as the appendix: it is the evidence for the ranking, and it
disappears when the ranking is read.

## Completeness contract

- All five categories present.
- Every factor carries at least one variable and one concrete example.
- A ranking of exactly three factors, each with why it moves the outcome.
- No factor without an example.

criteria:
  - id: category-count
    kind: count
    text: "All five categories present"
  - id: factor-density
    kind: presence
    text: "Every factor carries a variable and a concrete example"
  - id: ranking
    kind: count
    text: "Exactly three ranked factors, each with a reason"
  - id: situational-specificity
    kind: semantic
    text: "Variables describe observable situations, not demographics or truisms"

*Synthetic — not evidence.*
