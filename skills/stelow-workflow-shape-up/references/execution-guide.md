---
source: stelow (consolidated)
original_files: sequencing-and-persistence.md, cross-domain-adaptation.md, evolutionary-exploration.md
date: 2026-05-15
---

# Shape Up — Sequencing, Persistence & Cross-Domain

## Sequencing Integration

If `tech-planning-sequencing` skill is available:

**Offer:**
- implementation ordering
- dependency sequencing
- rollout strategy
- risk-first execution
- vertical slicing

**Only after:**
- shaping convergence
- interface convergence

---

## visual review Review

Submit the proposal for review via the available review gate BEFORE final persistence.

**Purpose:**
- annotation
- collaborative review
- refinement
- approval

The user should review and approve there first.

---

## Persistence Rules

**Persist ONLY after:**
- ambiguity resolution
- required phase completions
- review gate approval
- explicit user approval

**If still exploratory:**
- avoid persisting final specs
- unless the user explicitly requests draft persistence

### Suggested path:
```
docs/{YYYY-MM-DD}/{slug}/plans/spec-product_{v}.md
```
- `{slug}` is kebab-case (e.g. `login-system`)
- `{v}` auto-incremented

### Guidelines:
- lowercase kebab-case
- concise descriptive names
- avoid spaces/special characters

**Persist:**
- problem
- solution
- risks
- out-of-scope
- sequencing
- recommendations
- selected interface direction

### Number the promises

Every promise the proposal makes gets a stable id in the spec: `S1`, `S2`, `S3`.
One promise per id, minted once, never renumbered. Design, tech, build and audit
then cite the id instead of restating the promise.

The reason is the audit: a requirement rewritten at each stage cannot be traced
to what shipped, and the person reviewing reads four descriptions of one promise
and has to decide which is current. An id that survives the chain is the whole
traceability story.

A promise that changes gets a new id, and the old one is marked dropped with the
reason, so the audit reports it as dropped instead of it silently never shipping.

**After persistence:**
- inform the full saved path
- reference consistently later when useful

---

## Cross-Domain Adaptation

This skill can shape:
- products
- workflows
- organizations
- AI systems
- education systems
- behavioral systems
- relationships
- routines
- physical experiences

### Adaptation heuristics:

| Product Concept | Cross-Domain Equivalent |
|---|---|
| feature | capability/intervention |
| user | participant/stakeholder |
| interface | interaction surface |
| workflow | process/routine |
| integration | coordination point |
| onboarding | adaptation/learning |
| UX friction | behavioral/operational friction |

**The shaping logic remains the same:**
- clarify tensions
- reduce ambiguity
- shape coherent scope
- expose trade-offs
- preserve adaptability

---

## Evolutionary Exploration (Optional)

When the proposal would benefit from:
- broader possibility exploration
- discovery of non-obvious paths
- stepping-stone thinking
- ecosystem thinking
- evolutionary experimentation
- future opportunity generation

**recommend invoking** `evolution-strategy`.

### Use especially when:
- the problem space is highly uncertain
- innovation paths are unclear
- the proposal risks converging too early
- multiple future trajectories may exist

Do not invoke automatically for straightforward implementation shaping.