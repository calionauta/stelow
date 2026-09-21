---
source: stelow (consolidated)
original_files: risk-analysis.md, persistence.md, output-expectations.md, output-format.md
date: 2026-05-15
---

# Tech Planning — Output, Risk & Persistence

## CTO Risk Analysis Framework

Act as an experienced Chief Technology Officer specializing in digital products with complex architectures.

**General analysis rules:**
- Declare limitations if documentation is insufficient
- Declare assumptions based on engineering principles

### Output structure

#### Part 1 — Dangers and uncertainties (for the proposal)

`⚠️ dangers and uncertainties`

For each critical risk:
- Description (probability and impact)
- What to avoid
- Path forward
- Key questions to answer

#### Part 2 — Detailed technical analysis (for engineering)

`🎯 key impact areas` — main functional requirements with significant technical impact

`🧐 analytical framework` — per area:
- Data and state impact
- Integration points and dependencies
- Codebase impact and complexity
- Technical risks
- NFRs and quality
- Senior perspective and trade-offs

`❓ clarification questions` — grouped by theme

---

## Persistence Rules

**Persist ONLY after:**
- engineering review approval
- sequencing convergence
- execution readiness validation

### Suggested convention:
```
docs/{YYYY-MM-DD}/{slug}/plans/spec-tech_{v}.md
```

### Guidelines:
- lowercase kebab-case
- concise descriptive naming
- avoid special characters

**Persist:**
- sequencing
- scopes
- spikes
- DoD
- acceptance criteria
- rollout ordering
- technical risks
- engineering recommendations

**Scope contracts (required, one file per scope):** planning authors the
machine contract executors read — `scopes/{scope-id}.json` next to the
state dir (`scope-1` → `scopes/scope-1.json`):

```json
{
  "acceptance_criteria": ["Observable outcome 1", "Observable outcome 2"],
  "verify_commands": ["npm test -- scope-area"],
  "target_files": ["path/to/area.ts"]
}
```

`acceptance_criteria` are observable outcomes (the same sentences the
Scope DoD states), never process descriptions. `verify_commands` run
against the tree and exit non-zero on failure. A scope without its
contract file executes against prose only — hosts surface that as an
explicit condition instead of guessing.

**After persisting:**
- explicitly provide the saved path
- reference it consistently in future execution discussions

---

## Output Format Template

### 0. Product Context (from shaping)
Problem, Scope (IN/OUT), Business rules, Interface direction, Risks.

### 1. Identified Scopes
Critical Initial Spikes (if applicable) + Main Functional Scopes.

**Scope naming convention:**
- First scope: "[Feature]: Core Domain" (e.g., "Auth: Core Domain")
- Subsequent scopes: descriptive noun (e.g., "Payment Processing", "User Dashboard")
- Spike scopes: "[Feature]: [Topic] Spike" (e.g., "Auth: OAuth Integration Spike")

### 2. High-Level Sequence of Identified Scopes
Each scope with justification based on sequencing strategy and principles.

### 3. Detailed Development Sequence per Scope

For each scope, open with a machine block the tracker parses (see
`scopes-and-sequencing.md` for the full field reference):

```
[SCOPE-1] Descriptive scope title
[TYPE] feature
[MAX_ITERATIONS] 3
[TARGET_FILES]
- path/to/area.ts
Dependencies: none
```

Human headings (`### SCOPE-1: Title`) are also accepted by `sync-scopes`
as a fallback, but the bracket form above is canonical — write it first.

For each scope:
- **Scope:** `[name]`
- **Type:** `feature` | `optimization` | `spike` | `test-*`
- **Risk Score:** 1-5 (see Principles 0-6 in scopes-and-sequencing.md)
- **Overall Scope Goal:** concise description
- **Scope DoD:** what defines this scope as complete
- **Dependencies:** which scopes must complete first (write as `Dependencies: SCOPE-1, SCOPE-3`; must be acyclic — `sync-scopes` refuses `blockedBy` cycles at ingest instead of stalling)

**Task table format:**

| # | Task | Components | Risk | Done Criterion | Order Rationale |
|---|------|-----------|------|---------------|-----------------|
| 1.1 | Task name | api-user, db-schema | LOW (2) | Criterion | P0: External mock |
| 1.2 | Task name | ui-auth | HIGH (4) | Criterion | P3: Risk score 4, front-load |

**Task columns:**
- **#**: Hierarchical ID (`scope.task`, e.g., `3.2`)
- **Task**: Short action description
- **Components**: Key technical areas (`api-*`, `db-*`, `ui-*`, `service-*`, etc.)
- **Risk**: LOW/HIGH or numeric 1-5 scale with score
- **Done Criterion**: Completion standard
- **Order Rationale** (REQUIRED): Which Principle (0-6) justifies position. E.g., `P0: External dependency`, `P3: Risk score 5, spike required`, `P5: Nice-to-have`. Mark inferred items with `[suggested]`.

### 4. Final Summary – Main Functional Scope Names

### Notes
- Suggestive mode: mark suggestions with `[suggested]`

---

## Output Expectations

### Strong outputs:
- reduce execution uncertainty
- expose hidden technical risks
- sequence realistically
- minimize rollout fragility
- improve operational clarity
- optimize validation order

### Weak outputs:
- fake certainty
- flat task lists
- missing rollout thinking
- ignoring dependencies
- no spike identification
- giant unsequenced backlogs
- architecture astronautics
- premature optimization