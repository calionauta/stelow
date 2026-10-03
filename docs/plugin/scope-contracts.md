# Scope contracts

How Stelow keeps delivery maps, interface decisions, and human authority
consistent — on any host, including bb.

## Scope ownership

The `scope` stage owns the approved delivery map. `stelow-product-scope-mapping`
is a product method, not a new stage: Shape may propose candidate slices,
planning may enrich approved slices with technical detail, but neither can
change scope IDs, ownership, IN/OUT boundaries, or dependency meaning. A
narrow bugfix or mechanical refactor may use a one-scope plan instead of a
full map (reason and minimum evidence recorded); a refactor with more than
one delivery scope is refused at execution until an approved, semantically
valid `scope-map.json` exists.

## Decision records

Interface Contrast receipts distinguish agent-authored evidence from human
authority, the decision route and disposition, fixed constraints, criteria,
options, accepted sacrifice, Shape and Scope Map versions, provenance and
missing evidence, and the next required action. An agent may stop for a
human decision, but it cannot fabricate human evidence or silently change
product policy.

## Challenges and staleness

A scope-map challenge names the affected scopes, reason, evidence, and
destination: product-commitment changes return to Shape; scope-boundary and
dependency changes return to Scope. Dependent artifacts stay marked stale
until the required approval is current.

## Native human boundaries

A native `needs_input` result carries the question, question ID, contract
ID, boundary ID, reaction-or-confirmation kind, Shape version, Scope Map
version when present, and answer schema. The card control plane remains the
only owner of the question: an answer resumes the same run only when its
boundary and versions match the current run.
