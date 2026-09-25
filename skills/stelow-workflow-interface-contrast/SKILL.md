---
name: stelow-workflow-interface-contrast
description: >
  [stelow] Run the reaction-first Interface Contrast decision loop. Produces a
  decision brief, explicit alternatives, provenance, and a selection receipt
  without hiding product authority in an LLM preference.
metadata:
  frequency: weekly
  category: workflow
  execution:
    mode: orchestrated
    recipe: interface-contrast
    capabilities: [pipeline, structured-output]
    write_policy: artifact
    permission_profile: inherit
  context-cost: medium
  author: calionauta
  author-url: https://github.com/calionauta
---

# Interface Contrast

Use this skill during the existing Interface stage. It does not create a new root stage and it does not own card state or execution lifecycle.

## Method

1. Read the approved Scope Map when one exists and record its version.
2. Write the decision question, fixed constraints, criteria, and missing evidence.
3. Preserve the decision-maker's first reaction before showing agent synthesis.
4. Generate bounded alternatives with explicit related dimensions and compatibility.
5. Show trade-offs, evidence, missing evidence, and accepted sacrifice.
6. Stop for a live question when the choice changes product authority or cannot be made from current evidence.
7. Emit a selection receipt only after a current answer or an explicit agent disposition.

## Artifact contract

The recipe writes:

- `interfaces/contrast.json` — brief, alternatives, provenance, and disposition;
- `interfaces/selection-receipt.json` — current selection or named stop;
- `interfaces/interfaces.md` — readable rendering of the validated records.

The JSON records are the source of truth. Markdown is a view, not a second decision state.

## Authority

The agent may classify and recommend. It may not fabricate human evidence or turn its own preference into product approval. Auto mode must use an agent receipt and a named human or Shape disposition when authority is product-significant.

## Shape and scope routing

- A product commitment or new approval actor routes to `shape-contrast` / Shape.
- Insufficient evidence routes to `research-needed` or `repair-brief`.
- A new scope boundary or dependency emits `scope-map-challenge.json`; it never mutates the approved map in place.
- An accepted existing interface uses `existing-interface-no-comparison` and spends no focal round.

## Quality checks

Before returning:

- every option has an ID, primary value, related values, and compatibility;
- every evidence item has provenance;
- fixed constraints and accepted sacrifice are explicit;
- the current Shape and Scope Map versions are recorded;
- the disposition names a valid next route;
- a human boundary, when present, carries a contract ID, boundary ID, versions, and answer schema;
- no missing input is silently invented.
