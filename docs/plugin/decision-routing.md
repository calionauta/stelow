# Decision routing

A stage transition, completion gate, or human-question requirement must
never be delegated to a model when the contract can be checked from
state, artifacts, receipts, dependencies, or claims. That is the whole
policy; everything below is its implementation on bb. (The portable half
of the principle lives in the Core workflow pages.)

## Order of preference

```
deterministic rules → configured Decision API/router → configured preset fallback
```

Modes: `rules` (deterministic host policy); `api` (default `simplejev`,
keyless and deterministic; `classifier.dev` is faster but its confidence
moves on identical input, so it cannot gate; `jev` needs a key and is most
accurate); `preset` (explicitly configured low-frequency judge only).
Unknown modes, missing routes, low confidence, timeouts, and malformed
answers degrade to the point's built-in rules — never a silently spawned,
unconfigured LLM.

## Registered points

`triage-intent` (advisory intent classification), `artifact-criteria`
(semantic criterion scoring), `auto-continue` (idle-worker veto),
`inbox-severity` (advisory promotion). Thresholds are per-point and their
direction is not uniform — each point's wording ships with its own
registry entry, because one shared label would misdescribe at least one
point. Two read-only CLI commands (`verify-tasks`, `gap-triage`) judge
through `artifact-criteria` without registering their own points, degrade
to `unverifiable` below the floor, and gate nothing.

## Known limits

No router point sits at a stage transition or artifact acceptance — all
four are at the edges (creation, idle resume, inbox tick, explicit CLI).
Three candidates were measured against the live card corpus and rejected
(ask-necessity, scope-map-challenge, interface-selection-support): each
failed the bar, which is unchanged for future points — prove deterministic
rules cannot answer it, then register a bounded schema with a confidence
policy, a fallback, tests against real artifacts, and a refusal when
confidence is insufficient.
