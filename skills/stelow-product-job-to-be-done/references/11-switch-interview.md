# Prompt 11: Switch Interview — timeline and the four forces

**When to use:** to explain one real switch: why a person started looking, what
pulled them, what scared them, what kept them. This is the prompt behind the
forces diagram.

**Variables:**
- `{{Interview}}`: transcript, notes or messages the user supplied
- `{{Job}}`: the job the person was trying to get done
- `{{Switch}}`: what they moved from and to, if known

**Read first:** `00-evidence-policy.md`.

---

## What this prompt does and does not do

It reconstructs a switch the user already has material for. It does not conduct
the interview. If the user has nothing, the output is a **hypothesis-mode**
forces diagram: useful to plan the interview, never presented as a finding.

## The interview it assumes

Past tense only. No hypotheticals, no "would you". The timeline:

1. **First thought** — the moment the old way stopped being tolerable
2. **Passive looking** — noticing alternatives without acting
3. **Active looking** — comparing, asking, pricing
4. **Deciding** — the moment the trade was made
5. **First use** — what happened right after

For each step: what happened, when, who was involved, what almost stopped it.

## The four forces

| Force | Question | Direction |
|---|---|---|
| **Push** | what about the current situation became intolerable | away from the present |
| **Pull** | what the new thing promised | toward the new |
| **Anxiety** | what about the new thing frightened them | against the switch |
| **Habit** | what about the present was comfortable or familiar | against the switch |

A switch happens when push + pull > anxiety + habit. The diagram is a reading aid,
not a measurement: do not score the forces unless the user asks, and never
present a score as data.

---

## Prompt

```
## Switch
Job: {{Job}}
Switch: {{Switch}}
Material: {{Interview}}

## Timeline
| Stage | What happened | When | Who | What almost stopped it | Status |
|---|---|---|---|---|---|
| First thought | | | | | |
| Passive looking | | | | | |
| Active looking | | | | | |
| Deciding | | | | | |
| First use | | | | | |

## Forces

### Push — away from the present
- {force} — Status: {status} — Evidence: {quote or "none"}

### Pull — toward the new
- ...

### Anxiety — against the switch
- ...

### Habit — against the switch
- ...

## Reading
- A força mais forte: {force} — {why}
- A força que o produto pode mover: {force} — {how, without naming a feature}
- A força que o produto não move: {force} — {why not}
- O que ainda falta perguntar: {question} — {what it would settle}

## Closing
- Status geral: `Input-derived` | `Hypothesis — bet`
- Se hypothesis mode: a entrevista mínima que produziria o diagrama de verdade.
```

## Rules

- Every force entry carries a `Status`. With no supplied material, all of them
  are `Hypothesis — bet` and the output opens with the hypothesis banner.
- A quote is a quote: verbatim, attributed to a role class, never to a name the
  user did not give.
- No force without an evidence line. "Evidence: none" is a valid value and must
  be written, not hidden.
- Do not name a feature. The reading says what force the product could move, not
  what to build.

## Completeness contract

- The five timeline stages, even when a stage is `Open`.
- The four forces, each with at least one entry or an explicit `Nenhuma` with a
  reason.
- A reading with the strongest force, the movable one and the immovable one.
- Hypothesis mode banner whenever no material was supplied.

criteria:
  - id: timeline-stages
    kind: count
    text: "The five timeline stages present, each with a Status"
  - id: four-forces
    kind: presence
    text: "Push, Pull, Anxiety and Habit each carry at least one statused entry"
  - id: no-invented-quotes
    kind: semantic
    text: "Quotes are verbatim or absent; no quote is reconstructed from a persona"

*Synthetic — not evidence.*
