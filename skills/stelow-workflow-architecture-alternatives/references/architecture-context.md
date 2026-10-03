# Architecture Exploration — Context & When to Use

## Progressive Clarification Principle

Prefer proceeding with explicit assumptions instead of blocking for additional information.

**Only ask follow-up questions when missing information would materially change:**
- responsibility split
- sync vs async strategy
- data ownership
- rollout and migration philosophy
- reversibility posture
- technical feasibility

If assumptions are made:
- state them explicitly
- continue with the exploration

**Avoid asking for:**
- restating already available context
- full specifications
- exhaustive requirements
- formal solution documents

---

## When to Use

### Use this skill when:
- comparing ways to construct a product or feature
- construction decisions are ambiguous (structure, contracts, data, rollout)
- evaluating competing architectural approaches or integration models
- backend or platform structure meaningfully affects product strategy
- designing APIs or service contracts where construction philosophy matters
- translating committed scopes into concrete construction directions

### Not just for backend — the 5 direction seeds map across surfaces:

| Seed | Reading |
|---|---|
| A (Conventional) | Boring splits, synchronous calls, single ownership |
| B (Decoupled) | Events, queues, streams; parts evolve independently |
| C (Intelligence-led) | Models, predictions, realtime sync collapsing user work |
| D (Radical reduction) | Fewest moving parts; collapse services and stores |
| E (Power-operator) | CLIs, SDKs, batch paths, dense contracts |

---

## Relationship to Interaction Alternatives

Interaction asks how it behaves. Architecture asks how it is built.
Architecture serves the chosen interaction direction — it never reinterprets it.
When both run, interaction leads and architecture follows.
When the product has no UI surface, architecture carries the divergence and
interaction collapses to a contract note.
