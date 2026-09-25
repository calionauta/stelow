---
name: stelow-product-scope-mapping
description: >
  [stelow] Break a product proposal into coherent vertical delivery scopes with
  explicit outcomes, boundaries, dependencies, capabilities, evidence, and open
  decisions. Use during the Scope stage or standalone from Explore. This skill
  produces a draft or approved scope map; it does not own execution.
metadata:
  frequency: weekly
  category: product
  execution:
    mode: reference
    recipe: null
    capabilities: []
    write_policy: none
    permission_profile: inherit
  context-cost: medium
  author: calionauta
  author-url: https://github.com/calionauta
disable-model-invocation: true
---

# Scope Mapping

Use this skill to turn an approved product proposal, technical plan, or codebase context into a small set of coherent delivery scopes.

The method is product planning: it discovers the boundaries of the work and makes uncertainty visible. It does not create execution tasks, choose a runner, or silently change an approved Shape.

## Required input

Use the available proposal, spec, codebase context, and constraints. If the request is not approved for Scope, stop at the current lifecycle boundary and name the missing gate.

Record the input sources before generating scopes. Do not invent product authority, evidence, or approval.

## Method

1. Restate the decision the map must support.
2. Identify the user-visible or operational outcome of the work.
3. Split the outcome into vertical scopes that can each deliver a coherent result.
4. Give every scope a stable ID, outcome, IN items, OUT items, capabilities, and dependencies.
5. Mark open decisions and evidence gaps explicitly.
6. Check that the graph is acyclic and that no scope silently owns another scope's boundary.
7. If a narrow bugfix or mechanical refactor needs no full map, emit a one-scope plan and record why the full map is unnecessary.

## Output contract

Write `scope-map.json` using the contract in `schemas/scope-map.json`.

The map is a draft until an approval receipt is present. An approved map is immutable for downstream planning. Planning may enrich each approved scope with tasks, risks, NFRs, target files, acceptance criteria, and sequence, but it may not change scope IDs, ownership, IN/OUT boundaries, or dependency meaning.

If later work changes a product commitment, scope boundary, or dependency meaning, emit `scope-map-challenge.json` and route through the canonical Scope or Shape transition. Do not rewrite the approved map in place.

## Standalone use

An Explore caller may invoke this skill without a Build card. The result is a draft map with a readable Markdown companion (`explore-scope-map.md`). JSON evidence is optional and must not replace the primary readable artifact.

## Quality checks

Before returning the map, verify:

- every scope has a stable ID and observable outcome;
- every dependency references an existing scope;
- the dependency graph is acyclic;
- IN and OUT boundaries are explicit;
- capabilities and evidence have provenance;
- open decisions are visible;
- the current Shape version and map version are recorded;
- no approval is fabricated.

When a check fails, repair the draft or report the exact missing input. Do not hide uncertainty in prose.
