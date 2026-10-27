# Prompt 4: Competitor Discovery

**Source:** https://calionauta.substack.com/p/prompt-ia-descoberta-de-competidores

**When to use:** to see everything the user is hired *instead of* the product —
including the workarounds nobody calls competition.

**Variables:** `{{Job}}`, optional `{{Steps}}` from Prompt 10.

**Read first:** `00-evidence-policy.md`.

---

## Prompt

```
Job to be done: {{Job}}
Steps, if the map exists: {{Steps}}

Competition is not a product category. It is whatever gets hired for this job.

## Output

## Direct competitors
Products or services that solve the same job.
| Competitor | What it does | Step it serves | Status |
|---|---|---|---|

## Indirect competitors
Solutions that address the job differently.
| Competitor | What it does | Step it serves | Status |
|---|---|---|---|

## Hidden competitors
Workarounds nobody calls competition: a spreadsheet, a WhatsApp group, memory,
doing nothing, delegating to a person.
| Workaround | What it replaces | Step it serves | Status |
|---|---|---|---|

## Key insights
- ...

Rules:
- Every named brand carries `Status`: `verificado` (with source) or `candidato`
  (unverified). A brand without a source is `candidato` and is never presented as
  market fact.
- `Step it serves` ties the competitor to the job map when it exists. A competitor
  with no step is not competing for this job — say so or drop it.
- Hidden competitors must be non-obvious. The market leader restated is not hidden.
- "Doing nothing" is a legitimate competitor and usually the strongest.
```

## Why the step column

Prompt 10 locates where the job breaks. A competitor list without that column is
a market summary; with it, it answers "who wins at step 4". That is the only form
in which the list changes a decision.

## Completeness contract

- Four sections: Direct, Indirect, Hidden, Key insights.
- Each competitor section holds at least 3 entries with a status.
- Every entry names the step it serves, or says it serves none.
- At least one hidden competitor is a non-tool workaround.

criteria:
  - id: section-presence
    kind: count
    text: "Direct, Indirect, Hidden and Key insights present"
  - id: example-density
    kind: count
    text: "Each competitor section holds 3+ entries"
  - id: status-per-entry
    kind: presence
    text: "Every named brand carries verificado or candidato"
  - id: step-link
    kind: presence
    text: "Every entry names the step it serves or states that it serves none"
  - id: hidden-genuineness
    kind: semantic
    text: "Hidden competitors are workarounds, not market leaders restated"

*Synthetic — not evidence.*
