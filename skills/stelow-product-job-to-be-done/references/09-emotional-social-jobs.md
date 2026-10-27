# Prompt 9: Emotional & Social Jobs

**Source:** https://calionauta.substack.com/p/prompt-ia-descoberta-de-jobs-emocionais

**When to use:** after the map exists, to find what the person wants to feel and
how they want to be seen while doing the job. Without a step to attach to, this
prompt produces adjectives.

**Variables:** `{{Job}}`, `{{Steps}}` from Prompt 10, `{{Segment}}`, `{{Depth}}`.

**Read first:** `00-evidence-policy.md`.

---

## Prompt

```
Job: {{Job}}
Segment: {{Segment}}
Steps: {{the steps, riskiest first}}
Depth: {{Depth}}

## Definitions

Emotional job — how the performer wants to feel, or avoid feeling, at a moment of
the job. Focus on the person.

Social job — how the performer wants to be perceived, or avoid being perceived;
how they want to connect or belong, or avoid it. Focus on other people.

## Anchor every job to a step

A feeling with no moment cannot be designed for. For each step, ask what the
person feels and what they fear being seen as, right there.

Steps with no plausible emotional or social stake get `Nenhum` and a reason. That
is a finding: back-office steps often carry no social stake, and inventing one
produces decoration.

## Statement rules

- Positive phrasing, or `Avoid` phrasing — never both for the same outcome.
- Imperative verb, complete sentence.
- Specific context: the moment, not a category.
- No conjunctions.
- One clear nuance per statement; do not restate the same fear in two forms.

## Output

| Etapa | Job | Tipo | O que a pessoa faz quando acontece | Status |
|---|---|---|---|---|
| {step} | {statement} | Emocional / Social | {observable signal} | {status} |

How many steps:

- `quick` — the 3 riskiest
- `standard` — the 6 riskiest
- `deep` — all

If the map does not exist, run Prompt 10 first or ask for the step list. An
unanchored list is the last resort, and the output says it is one.

## Closing
- O medo que mais trava a etapa: {statement} — {step}
- Onde o medo é social e não funcional: {step} — {why}
```

## Why anchoring changes the output

`Avoid feeling exposed` is a mood. `Avoid feeling exposed when sending an expense
that will be questioned` is a design brief: it names the moment, the object and
the audience. The second one can be solved; the first one can only be agreed with.

## Completeness contract

- One emotional and one social job per anchored step, by depth.
- Every row names the step, the statement and an observable signal.
- No opposing pairs for the same outcome.
- Steps without a stake are `Nenhum` with a reason.

criteria:
  - id: anchored-rows
    kind: presence
    text: "Every job row names the step it belongs to"
  - id: pair-per-step
    kind: count
    text: "One emotional and one social job per anchored step, by depth"
  - id: observable-signal
    kind: presence
    text: "Every row carries an observable signal"
  - id: no-opposing-pairs
    kind: semantic
    text: "No opposing pair claims the same outcome; statements follow the rules"

*Synthetic — not evidence.*
