---
name: stelow-workflow-architecture-contrast
description: >
  [stelow] Run the invariants-first Architecture Contrast decision loop.
  Produces a decision brief, explicit construction directions, provenance,
  and a selection receipt without hiding technical authority in an LLM
  preference.
metadata:
  frequency: weekly
  category: workflow
  execution:
    mode: orchestrated
    recipe: architecture-contrast
    capabilities: [pipeline, structured-output]
    write_policy: artifact
    permission_profile: inherit
  context-cost: medium
  author: calionauta
  author-url: https://github.com/calionauta
---

# Architecture Contrast

Use this skill during the existing Architecture stage. It does not create a new root stage and it does not own card state or execution lifecycle.

## Method

0. Read the approved Scope Map when one exists and record its version. Read `selected-interface.md` when one exists: the construction must serve the chosen interaction direction, never reinterpret it.
1. Write the decision question, fixed constraints, invariants that must hold regardless of direction, criteria, and missing evidence.
2. Preserve the decision-maker's invariants before showing agent synthesis. A reference architecture cited here is **provenance for a direction already named** — never a source of new directions, because generating fresh options from a gallery would replace recorded invariants with the agent's browsing.
3. Generate bounded directions with explicit trade-offs, reversibility notes, and compatibility with the approved scopes.
4. Show trade-offs, evidence, missing evidence, and accepted sacrifice.
5. Stop for a live question when the choice changes technical authority or cannot be made from current evidence.
6. Emit a selection receipt only after a current answer or an explicit agent disposition. Then record the pick host-side with `scripts/stelow decide --selected <winner> --rejected <losers> --scopes <covered>` — the JSON receipt is the brief's record, the host record is what binds future work. Never hand-write `decision-receipts.json`; overturning a live pick needs an opened challenge (`scripts/stelow decide --open-challenge --against <receipt> --reason <why>`, then `--challenge <challenge-id>`).

## Artifact contract

The recipe writes:

- `architecture/contrast.json` — brief, directions, provenance, and disposition;
- `architecture/architecture.md` — readable rendering of the validated records.

The choice ask inside the Architecture stage remains the owner of the actual
architecture pick. Architecture Contrast does not create a second choice stage or
choice receipt.

The JSON records are the source of truth. Markdown is a view, not a second decision state.

## Authority

The agent may classify and recommend. It may not fabricate decision-maker evidence or turn its own preference into technical approval. Below the tech-review threshold the worker adopts with an agent receipt; at the threshold and above a human pick is required when authority is construction-significant.

## Shape and scope routing

- A product commitment or new approval actor routes to `shape-contrast` / Shape.
- Insufficient evidence routes to `research-needed` or `repair-brief`.
- A new scope boundary, dependency, or construction invariant emits a challenge record; it never mutates the approved map or an approved decision in place.
- An accepted existing architecture uses `existing-architecture-no-comparison` and spends no focal round.

## Quality checks

Before returning:

- every direction has an ID, primary value, trade-offs, reversibility, and scope compatibility;
- every evidence item has provenance;
- fixed constraints, invariants, and accepted sacrifice are explicit;
- the current Shape, Scope Map, and selected-interface versions are recorded;
- the disposition names a valid next route;
- the pick is recorded host-side (`scripts/stelow decide`), not only in `contrast.json`;
- a human boundary, when present, carries a contract ID, boundary ID, versions, and answer schema;
- no missing input is silently invented.
