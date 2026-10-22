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

0. Read `../stelow-workflow-orchestrator/references/cli-tools/ui-design-research.md` if any real design reference is cited. At this stage a reference is **provenance for an option already named** — never a source of new options, because generating fresh alternatives from a gallery would replace the decision-maker's recorded first reaction with the agent's browsing.
1. Read the approved Scope Map when one exists and record its version.
2. Write the decision question, fixed constraints, criteria, and missing evidence.
3. Preserve the decision-maker's first reaction before showing agent synthesis.
4. Generate bounded alternatives with explicit related dimensions and compatibility.
   **Each option carries the wireframe of the proposal it came from** — copy
   the ASCII sketch across verbatim. The interface gate is a visual review of
   these proposals, and an option the gate cannot look at is an option nobody
   chose on purpose.
5. Ground every alternative in the delivery slices: record per-option scope coverage (served scope IDs, friction scope IDs with notes) against the recorded map version. When no map exists, say so and why — never invent coverage.
5. Show trade-offs, evidence, missing evidence, and accepted sacrifice.
6. Stop for a live question when the choice changes product authority or cannot be made from current evidence.
7. Emit a selection receipt only after a current answer or an explicit agent disposition. Then record the pick host-side with `scripts/stelow decide --selected <winner> --rejected <losers> --scopes <covered>` — the JSON receipt is the brief's record, the host record is what binds future work. Never hand-write `decision-receipts.json`; overturning a live pick needs an opened challenge (`scripts/stelow decide --open-challenge --against <receipt> --reason <why>`, then `--challenge <challenge-id>`).

## Artifact contract

The recipe writes:

- `interfaces/alternatives.json` — the generated proposals, with their states;
- `interfaces/alternatives-verification.json` — the verification pass over them;
- `interfaces/alternatives.md` — the proposals as a readable document, each with
  its wireframe. The interface gate reviews THIS: an option written only as
  prose cannot be reviewed at a visual gate;
- `interfaces/contrast.json` — brief, alternatives, provenance, and disposition;
- `interfaces/interfaces.md` — readable rendering of the validated records,
  including each option's scope coverage in plain words.

The existing canonical `selection` stage remains the owner of the actual
interface pick. Interface Contrast does not create a second selection stage or
selection receipt.

The JSON records are the source of truth. Markdown is a view, not a second decision state.

## Authority

The agent may classify and recommend. It may not fabricate human evidence or turn its own preference into product approval. Auto mode must use an agent receipt and a named human or Shape disposition when authority is product-significant.

## Shape and scope routing

- A product commitment or new approval actor sets `route: "shape-contrast"`, which returns the workflow to the `shape` stage. That is the receipt's route VALUE — the stage it names is `shape`; there is no separate skill called `shape-contrast`, and the route/disposition pair it accepts is `stop:human-decision-required` or `stop:shape-required`.
- Insufficient evidence routes to `research-needed` or `repair-brief`.
- A new scope boundary or dependency emits `scope-map-challenge.json`; it never mutates the approved map in place.
- An accepted existing interface uses `existing-interface-no-comparison` and spends no focal round.

## Quality checks

Before returning:

- every option has an ID, primary value, related values, and compatibility;
- **every option carries its `wireframe`** — the ASCII sketch copied from the proposal it came from. The interface gate is a VISUAL review of these proposals, and a receipt whose options have no sketch describes a choice nobody can look at. This is the same rule the hybrid option already carries in `stelow-workflow-interface-alternatives`: a hybrid written only as prose cannot be reviewed at the gate. An option without a wireframe is not a smaller gap than a prose-only hybrid — it is the same gap;
- every option names its scope coverage (served/friction scope IDs with notes) against the recorded map version, or states explicitly that no map exists and why;
- every evidence item has provenance;
- fixed constraints and accepted sacrifice are explicit;
- the current Shape and Scope Map versions are recorded;
- the disposition names a valid next route;
- the pick is recorded host-side (`scripts/stelow decide`), not only in `contrast.json`;
- a human boundary, when present, carries a contract ID, boundary ID, versions, and answer schema;
- no missing input is silently invented.
