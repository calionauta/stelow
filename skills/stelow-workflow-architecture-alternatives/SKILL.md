---
name: stelow-workflow-architecture-alternatives
description: >
  [stelow] Architecture alternatives exploration skill. Use when comparing ways
  to construct a product (responsibility split, sync vs event-driven, data
  ownership, rollout and integration approach). Produces 2 to 5 directions
  depending on exploration breadth, plus a hybrid recommendation whenever
  more than one direction exists. Part of stelow but can be used standalone.
metadata:
  frequency: monthly
  category: workflow
  execution:
    mode: orchestrated
    recipe: architecture-alternatives
    capabilities: [fanout, structured-output]
    write_policy: artifact
    permission_profile: inherit
  context-cost: medium
  author: calionauta
  author-url: https://github.com/calionauta
---

# Architecture Alternatives

> **Tools:** See `../stelow-workflow-orchestrator/references/cli-tools/subagents.md` for subagent patterns.

## Overview

This skill executes the Architecture Alternatives phase: diverging construction
directions before any commitment. It is the structural sibling of interaction
alternatives. Interaction asks how it behaves. Architecture asks how it is built.

## How to Load

### Via Orchestrator (recommended)
The orchestrator reads this file directly when needed.

### Standalone
This skill works standalone. Use the Input Detection section below to tell the skill what construction decision to explore. Follow the instructions inline.

**Standalone awareness:** when inside stelow, reads exploration breadth from the workflow config (`exploration.count`, `exploration.hybrid`). When standalone, defaults to 3 directions + hybrid. If the config is not reachable, pass the count explicitly.

## Process

**Step 0: Read exploration breadth and choose direction count.**

Exploration breadth controls how many construction directions are compared.
A hybrid synthesis is produced whenever more than one direction exists,
independent of the count.

| Count | Directions explored | Hybrid |
|-------|--------------------|--------|
| `1` | 1 direct direction only. No divergence. Trivial changes by explicit override only. | skip |
| `2` | 2 most-differentiated directions | yes |
| `3` | 3 directions | yes |
| `4` | 4 directions | yes |
| `5` | 5 directions | yes |

```bash
# Inside stelow, read from workflow config; standalone defaults to 3 + hybrid.
COUNT="${EXPLORATION_COUNT:-3}"
HYBRID="${EXPLORATION_HYBRID:-yes}"
if [ "$COUNT" -le 1 ]; then
  HYBRID="skip"
fi
```

Direction seeds (pick the COUNT most-differentiated for the problem; never pad
with near-duplicates to hit the count):

- **A — Conventional build.** The safest established construction for this space: boring splits, synchronous calls, single ownership. Optimize for predictability and onboarding ease.
- **B — Decoupled flow.** Reframe the construction around events, queues, or streams. Optimize for independence of parts and evolution speed.
- **C — Intelligence-led.** Use models, predictions, or realtime sync to collapse work the user would otherwise do. Accept implementation complexity only where it meaningfully improves the outcome.
- **D — Radical reduction.** Fewest moving parts that still deliver the committed scopes. Collapse services, merge stores, defer abstractions. Optimize for clarity and reversibility.
- **E — Power-operator build.** Optimize for expert throughput: CLIs, SDKs, batch paths, dense contracts, minimal ceremony. Assume the operator knows the domain.

D removes parts to stay understandable. E removes ceremony to stay fast.
They are not interchangeable.

**Step 1:** Read the references before generating:

| File | Covers | When to read |
|---|---|---|
| `references/architecture-output-format.md` | Required sections per direction | **Before generating** |
| `references/architecture-context.md` | When to use, system mapping, progressive clarification | **Before starting** |

## Generate Directions (Step 1-2)

Use the subagents tool (see `../stelow-workflow-orchestrator/references/cli-tools/subagents.md`) to generate the selected directions in parallel. For count 1, run one worker only.

```
$COUNT parallel workers (fresh context, explicit reads):
  Generate only the assigned direction seed

CRITICAL — Before generating, each worker MUST read:
  1. references/architecture-output-format.md — full output format with all sections
  2. references/architecture-context.md — when-to-use and clarification rules
  3. spec-product.md — body + frontmatter (scope, IN/OUT, constraints)
  4. scope-map.json — approved scope boundaries and dependencies (when it exists)
  5. selected-interface.md — chosen interaction direction (when it exists; the construction must serve it, never reinterpret it)

Each worker MUST receive `reads: [spec-product.md, scope-map.json]` (plus `selected-interface.md` when present).
Each worker runs `context: "fresh"` — directions must be independent of orchestrator deliberation history.
Each outputs to .stelow/{date}/{dir}/architecture/direction-{letter}.md
```

- Each worker generates **one** direction (independent, no cross-contamination).
- Combined output: `.stelow/{YYYY-MM-DD}/{_dir}/architecture/architecture_{v}.md`

## Generate Hybrid (Step 3 — AFTER directions complete)

**CRITICAL:** Hybrid is generated only when `$HYBRID = yes` (count >= 2) and **AFTER** all directions are complete to avoid bias.

Use the subagents tool to merge:

```
Agent: worker
Task: Generate Hybrid Direction
Reads: selected direction files
Output: Append to architecture.md per references/architecture-output-format.md
```

The hybrid section must carry **its own composed component sketch** in a fenced block
and name the directions it composes. A hybrid written only as prose cannot be reviewed,
and a reader who picks the hybrid would land on text while the structures it merges
sit elsewhere in the file.

## Direction Choice

After all directions (+ hybrid when applicable), the choice follows the active
review posture (see `../stelow-workflow-orchestrator/references/human-gates.md`):

- Below the tech-review threshold → **worker adopts.** Adopt the hybrid recommendation (or the single direction for count 1) as the choice: extract it to `selected-architecture.md` per the section below with `selected_by: worker` noted, and advance. Do NOT park waiting for a human pick — a wait with no mandate is a stuck workflow.
- At tech-review threshold and above → **decision-maker chooses** via the structured question pattern (options with sketches as previews and direction files as openable references).

### Save Selected Architecture as Permanent Artifact

After the pick, extract it from `architecture_{v}.md` into:

```
.stelow/{YYYY-MM-DD}/{_dir}/architecture/selected-architecture.md
```

The saved artifact contains the **complete direction**: pattern declaration, component sketch, construction flow, trade-off analysis, risks and unknowns, and what it rules out.

Tech planning references this file for construction direction — it does NOT regenerate or reinterpret the architecture.

## Output

Architecture directions are saved to:
```
.stelow/{YYYY-MM-DD}/{_dir}/architecture/architecture_{v}.md
```

The chosen architecture (after the pick) is saved to:
```
.stelow/{YYYY-MM-DD}/{_dir}/architecture/selected-architecture.md
```

Completeness contract (the host validates these minima — never submit fewer,
per direction; direction count follows exploration breadth):
all sections per `references/architecture-output-format.md`; at least 600 words.

criteria:
  - id: direction-sections
    kind: count
    text: "All output-format sections present per direction"
  - id: word-count
    kind: count
    text: "At least 600 words"
  - id: tradeoff-decisiveness
    kind: semantic
    text: "Trade-Off sections recommend one direction with reasons, not lists of pros and cons"

## When to Use & Test Cases

Use when comparing construction directions before tech planning, or merging directions into a hybrid.

Should activate: "2 construction options for the sync pipeline", "hybrid from these directions".
Should NOT activate: "implement the chosen direction" (execution), "pick the UI" (interaction alternatives).

## Edge Cases

### Count allows one direction only
- Generate exactly 1 direction; skip the hybrid (nothing to combine).

### No approved scope map yet
- Derive boundaries from the shaped proposal alone; mark unmapped boundaries explicitly instead of inventing scope authority.

## Related Skills

- **stelow-workflow-shape-up**: Produces the shaped proposal that feeds this phase
- **stelow-workflow-interface-alternatives**: Interaction exploration that this phase serves, never reinterprets
- **stelow-workflow-architecture-contrast**: Decision loop that runs during the same stage
- **stelow**: Coordinates this skill with other phases

## Input Detection (Standalone Mode)

When called outside the workflow with no pre-existing spec-product.md context:

```
Input:
  ├── User provided a spec-product*.md path?
  │   └→ Read its IN/OUT scope and solution description
  ├── User described the construction problem verbally?
  │   └→ Extract: what must be built, constraints, what must hold regardless
  └── No structured input given?
       └→ Ask: "What construction decision do you want to explore? Describe
          what must be built, the constraints, and what must hold regardless
          of the direction."
```

Then follow the count-based generation process above.

## Environment Adaptation

If a tool is unavailable, check:
`../stelow-workflow-orchestrator/references/cli-tools/`

## Entry (mode detection)

When this skill loads, check for the stelow workflow marker:

```bash
if [ -n "$STELOW_WORKFLOW" ] && [ -n "$STELOW_STATE" ]; then
  echo "stelow: workflow mode (state=$STELOW_STATE)"
else
  echo "stelow: standalone mode (no STELOW_WORKFLOW marker)"
fi
```

In **standalone mode** (no marker), run the existing skill body unchanged.
In **workflow mode**, skip to `### Workflow slice` and emit a complete
`## Hand-off (workflow mode)` block at the end. See
`../stelow-workflow-entry/SKILL.md` for the full marker protocol.

## Hand-off (workflow mode)

```
stage          : architecture
description    : Architecture alternatives. Breadth-scaled exploration: 2 to 5 directions + hybrid.
status         : <done|partial|blocked>
artifacts      : <paths created or modified>
next-candidate : planning
gate           : none
rework-on      : scope
```

Workflow mode: emit the above Hand-off block verbatim, then stop. The
router skill consumes the next-candidate field and calls
`scripts/stelow advance <next-candidate>` to move state forward.

### Workflow slice

Workflow mode for the **architecture** stage. Standalone behavior lives in
the rest of this file (unchanged). Summary:

> Architecture alternatives. Breadth-scaled exploration: 2 to 5 directions + hybrid.

Primary actions (per stages.yaml): `read, write`. Run only the actions that
produce the artifacts promised in `## Hand-off`; skip anything that does
not advance the workflow.
