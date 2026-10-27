# Prompt 8: Financial Needs

**Source:** https://calionauta.substack.com/p/prompt-ia-descoberta-de-necessidades-financeiras

**When to use:** when someone other than the user pays, and the price or the risk
of the purchase is part of the decision. Skip it for a small self-serve
subscription: there is no financial job to discover.

**Variables:** `{{Job or segment}}`, `{{Purchaser}}` from Prompt 5, `{{Ticket}}`
(order of magnitude), `{{Depth}}`.

**Read first:** `00-evidence-policy.md`.

---

## Gate

Ask two things before running:

1. **Who pays?** The purchaser from Prompt 5. If the answer is "the user, on a
   card, without thinking", stop: financial needs is three lines, not a prompt.
2. **What is the ticket?** Below a month of someone's salary, the financial job is
   small; above it, it is a purchase process with its own actors.

If the gate fails, say so and return the three lines:
`custo de aquisição`, `custo de troca`, `custo de erro` — each one sentence, each
with a status.

## Prompt

```
Job: {{Job or segment}}
Perspective: the person who approves the purchase, for the beneficiary
Ticket: {{Ticket}}
Depth: {{Depth}}

Explore the solutions that could get this job done for the beneficiary.

As the purchaser, whose objective is to approve the most financially sound option:

- Discover the cost criteria that matter for THIS ticket size.
- 10 raw at `quick`, 20 at `standard`, 30 at `deep`.
- Keep the top 5 / 10 / 20 by depth.

## Statement rules

- Starts with **Minimize the cost of** — from the payer's perspective.
- Specific to a solution, objectively measurable, actionable.
- No conjunctions, no adjectives, no adverbs.
- MECE: no criterion repeats another.

## Prioritize

Same composite as Prompt 7: `(R + P + H) × (Inc + Inv)`, each 1–5, every score
with a **Basis**. The composite ranks work; it is not a measurement of willingness
to pay, and is never presented as one.

## Output

## Raw criteria
- {the depth's raw count, one line each}

## Top criteria

#### 1/{N} {criterion}
- **Justification:** why this cost is still not solved today
- **Score:** {composite} — **Basis:** {…}
- **Metrics:** {the unit: R$, hours, risk exposure; how to measure}
- **Current alternative:** {what people do today to avoid this cost — type, plus
  one example brand when it is known, marked `candidate`}

## Disposition
| Critério descartado | Por quê |
|---|---|

## Closing
- O custo que decide a compra: {criterion} — {why}
- O custo que parece grande e não pesa: {criterion} — {why}
- O que faria este comprador dizer não: {one line}
```

## Why the top list is short

Twenty criteria with five fields each is a hundred fields for a decision that
needs five. The raw list exists to diverge; the top list is the artifact, and it
is as long as the ticket justifies. The disposition table keeps the discarded ones
auditable without printing them in full.

## Completeness contract

- The depth's raw count, one line each.
- The depth's top count, each with the four fields.
- Every score carries a `Basis`.
- A disposition row for every discarded criterion.

criteria:
  - id: raw-count
    kind: count
    text: "Raw criteria holds the depth's raw count"
  - id: top-count
    kind: count
    text: "Top criteria holds 5/10/20 by depth"
  - id: criterion-fields
    kind: presence
    text: "Every top criterion carries Justification, Score with Basis, Metrics and Current alternative"
  - id: financial-quantification
    kind: semantic
    text: "Criteria quantify money, time or risk exposure, not comfort words"
  - id: disposition
    kind: presence
    text: "Every discarded criterion has a disposition row"

*Synthetic — not evidence.*
