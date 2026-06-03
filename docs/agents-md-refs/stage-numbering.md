# Stage Numbering Convention

All stages and substeps in `cali-product-workflow` follow this pattern:

```
<stage-slug>:<major>        — Major step (gaps of 10 for insertability)
<stage-slug>:<major>.<minor> — Sub-step within a major step
```

**Slugs** come from `stages.yaml` (single source of truth):
`triage`, `select`, `setup`, `context`, `shape`, `critique`, `gate`,
`scope`, `interface`, `int-gate`, `selection`, `planning`, `execution`,
`verification`, `audit`

## Rules

**Pattern:** Gap-based hierarchical — combines gap-based spacing (10, 20, 30)
with DFD-style leveling (`slug:major.minor`).

1. **Major steps use gaps of 10** (10, 20, 30, 40...). This allows inserting
   new steps between existing ones without renumbering.
2. **Sub-steps also use gaps of 10, on the decimal scale** (`<major>.10`,
   `<major>.20`). Not `<major>.1`, `<major>.2` — always two decimal digits
   to match the gap convention visually.
3. **Pre-steps** (steps before the first major action) use the `0.` prefix
   with gaps of 10: `0.10`, `0.20`, `0.30`. This preserves insertability.
4. **Every step heading** in a stage file starts with `slug:major.minor`.
   Example: `### setup:10 — Auto-Discovery Check`
5. **Cross-references** use slug.step: "See `setup:0.20`" not "See pre-step B".

## Examples

```
## setup:0.10 — Inbox Check
## setup:0.20 — Lessons Learned Injection
## setup:0.30 — Session Knowledge Injection
## setup:0.40 — External Context Pre-Load
## setup:10   — Auto-Discovery Check
## setup:20   — Stage Selection

## critique:30     — Parallel Critique Execution
## critique:30.10  — Reporter A: Flows + States
## critique:30.20  — Reporter B: Data + System
## critique:30.30  — Reporter C: Affordances + UX
## critique:30.40  — Reporter D: Feasibility
## critique:40     — Consolidate Reports
```

Before inserting a new step, check if an existing gap is available.
If no gap fits, add a decimal level: `setup:15` fits between `setup:10`
and `setup:20`; `setup:0.15` fits between `setup:0.10` and `setup:0.20`.

**Reference from AGENTS.md:** When adding/editing stages, use this file to
pick the right number. Stage files in `skills/cali-product-workflow/stages/`
must follow the `slug:major.minor` heading convention.
