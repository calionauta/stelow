---
name: stelow-workflow-interface-alternatives
description: >
  [stelow] Interface alternatives exploration skill. Use when generating interaction
  proposals using the 5-archetype library. Produces 1 to 5 proposals depending on
  exploration breadth, plus hybrid recommendation whenever more than one proposal
  exists. Part of stelow but can be used standalone.
metadata:
  frequency: monthly
  category: workflow
  execution:
    mode: orchestrated
    recipe: interface-alternatives
    capabilities: [fanout, structured-output]
    write_policy: artifact
    permission_profile: inherit
  context-cost: low
  author: calionauta
  author-url: https://github.com/calionauta
---

# Interface Alternatives

> **Tools:** See `../stelow-workflow-orchestrator/references/cli-tools/subagents.md` for subagent patterns, and `../stelow-workflow-orchestrator/references/cli-tools/ui-design-research.md` for real reference exemplars before proposing layouts.

## Overview

This skill executes breadth-scaled interface proposal generation (1 to 5
proposals plus a hybrid) for the Explore track and standalone use.

> **Scope:** the Build-track `interface` stage runs reaction-first
> Interface Contrast instead (`stelow-workflow-interface-contrast`:
> bounded alternatives with scope coverage and a named disposition). This
> skill never owns Build-track card state — its proposals are picked via
> `ask-patterns.md` Pattern 2A (Explore) while Build-track picks follow
> Pattern 2 from the contrast receipt.

## How to Load

### Via Orchestrator (recommended)
The orchestrator reads this file directly when needed.

### Standalone
This skill works standalone. Use the Input Detection section below to tell the skill what interface you want to brainstorm. Follow the instructions inline.

**Standalone awareness:** when inside stelow, reads exploration breadth from the workflow config (`exploration_count`, `exploration_hybrid`). When standalone, defaults to 3 interfaces + hybrid. If the spec-product.md is not in the expected path, pass it explicitly or let the LLM scan for `spec-product*.md` in the current directory.

## Process

**Step 0: Read exploration breadth and choose interface exploration depth.**

Exploration breadth controls how many interface alternatives are explored. Quality is not cut; the number of explored alternatives is.

| Count | Interface exploration |
|-------|----------------------|
| `1` | 1 suggested interface only. No alternative exploration. Trivial changes by explicit choice only. |
| `2` | 2 archetypes explored + 1 hybrid recommendation. |
| `3` | 3 archetypes explored + 1 hybrid recommendation. |
| `4` | 4 archetypes explored + 1 hybrid recommendation. |
| `5` | 5 archetypes explored + 1 hybrid recommendation. |

```bash
WF_DIR="$(ls -td .stelow/*/*/ 2>/dev/null | head -1)"
# shellcheck disable=SC1091
source "$(dirname "${BASH_SOURCE[0]:-$0}")/../../stelow-workflow-orchestrator/references/cli-tools/read-config.sh"
INTERFACE_COUNT=$(stelow_read_exploration_count)
HYBRID_SETTING=$(stelow_read_exploration_hybrid)
# Fallback to spec-product.md frontmatter if no stelow/index
if [ -z "$INTERFACE_COUNT" ]; then
  INTERFACE_COUNT=$(grep -oP '^exploration_count:\s*\K\S+' $(ls -t .stelow/*/*/plans/spec-product*.md 2>/dev/null | head -1) 2>/dev/null || echo "3")
fi
# Legacy appetite fallback (mapped once, then rewritten to knobs)
LEGACY_APPETITE=$(grep -oP '^appetite:\s*\K\S+' $(ls -t .stelow/*/*/plans/spec-product*.md 2>/dev/null | head -1) 2>/dev/null || echo "")
if [ -z "$INTERFACE_COUNT" ] && [ -n "$LEGACY_APPETITE" ]; then
  case "$LEGACY_APPETITE" in
    Lean) INTERFACE_COUNT=1 ;;
    Complete) INTERFACE_COUNT=5 ;;
    *) INTERFACE_COUNT=3 ;;
  esac
fi

case "$INTERFACE_COUNT" in
  1)
    ARCHETYPES="A" # Choose the archetype that best fits the work pattern.
    HYBRID="skip"
    ;;
  2)
    ARCHETYPES="A,D" # Safe baseline + simplicity; replace one with B/C/E if better justified.
    HYBRID="yes"
    ;;
  3)
    ARCHETYPES="A,D,E" # Safe baseline + simplicity + expert flow; replace one with B/C if better justified.
    HYBRID="yes"
    ;;
  4)
    ARCHETYPES="A,B,D,E" # Add the paradigm shift; replace one with C if better justified.
    HYBRID="yes"
    ;;
  5)
    ARCHETYPES="A,B,C,D,E"
    HYBRID="yes"
    ;;
  *)
    echo "EXPLORATION_UNKNOWN: '$INTERFACE_COUNT'. Defaulting to 3 interfaces + hybrid."
    INTERFACE_COUNT=3
    ARCHETYPES="A,D,E"
    HYBRID="yes"
    ;;
esac
# Explicit hybrid-off override (advanced): a host may set exploration.hybrid=false.
if [ "$HYBRID_SETTING" = "false" ]; then
  HYBRID="skip"
fi
```

**Step 1:** Read the `references/` files to guide the process:

| File | Covers | When to read |
|---|---|---|
| `references/interface-context.md` | Progressive Clarification, when to use, system equivalents | **Before starting** |
| `references/interface-reconstruction.md` | Context reconstruction, hidden job extraction | **Before generating** |
| `references/interface-rules.md` | Separation Rule, Work-Pattern-First Composition, Smell Self-Audit, State Coverage Baseline, Forced Trade-Off Rule, output quality | **Before generating** |
| `references/archetypes.md` | 5 archetypes with descriptions | **During generation** |
| `references/hybrid-recommendation.md` | Hybrid recommendation strategy | **Step 3 only** |

## Generate Proposals (Step 1-2)

Use the subagents tool (see `../stelow-workflow-orchestrator/references/cli-tools/subagents.md`) to generate the breadth-selected proposals in parallel. Run one worker per selected archetype (`$INTERFACE_COUNT` workers).

```
$INTERFACE_COUNT parallel workers (fresh context, explicit reads):
  Generate only the selected archetype(s) from $ARCHETYPES

⚠️ CRITICAL — Before generating, each worker MUST read:
  1. references/interface-rules.md — Work-Pattern-First Composition (mandatory Section 0)
  2. references/interface-rules.md — Smell Self-Audit (mandatory Section 6)
  3. references/interface-rules.md — State Coverage Baseline (mandatory Section 7)
  4. references/output-format.md — full output format with all 8 sections
  5. spec-product.md — body + frontmatter (`quality`, `exploration_count`, `exploration_hybrid`, `review_mode`, `domains_detected`)
  6. tech-recon.md — tech constraints (if it exists)

  For counts 2-5: also read
  `../stelow-workflow-orchestrator/references/cli-tools/ui-design-research.md`
  and ground each proposal's layout in at least one real reference exemplar.
  Count `1` spends no reference calls. If no reference is reachable, say the
  proposal rests on the archetype library alone — never invent one.

Each worker MUST receive `reads: [spec-product.md, tech-recon.md]` (or `references/interface-*.md` when running standalone).
Each worker runs `context: "fresh"` — proposals must be independent of orchestrator deliberation history.
Each outputs to .stelow/{date}/{dir}/interfaces/proposal-{letter}.md
```

- Each worker generates **one** proposal (independent, no cross-contamination)
- Each proposal **must** include Work Pattern Declaration (Section 0), Design Smell Audit (Section 6), and State Coverage Table (Section 7)
- Combined output: `.stelow/{YYYY-MM-DD}/{_dir}/interfaces/alternatives.md`


**Step 2:** see `references/output-format.md` for instructions to format and concatenate selected proposals.


## Generate Hybrid (Step 3 — AFTER proposals complete)


**CRITICAL:** Hybrid is generated only when `$HYBRID = yes` (count 2 or more) and **AFTER** all selected proposals are complete to avoid bias.

Use the subagents tool (see `../stelow-workflow-orchestrator/references/cli-tools/subagents.md`) to merge:

```
Agent: worker
Task: Generate Hybrid Proposal
Reads: selected proposal files
Output: Append to interfaces.md per hybrid-recommendation.md
```

The hybrid section must carry **its own composed wireframe** in a fenced block
and name the proposals it composes with their headings. The `int-gate` stage
reviews wireframes: a hybrid written only as prose cannot be reviewed there,
and a reader who clicks the hybrid option would land on text while the mockups
it merges sit elsewhere in the file.


## Where this skill ends

This skill produces the proposals and the hybrid. It does **not** run the
gate, make the pick, or write the interface artifacts — the workflow splits
those into their own stages, and duplicating them here is how a worker asks
the question twice or parks for a review nobody configured:

| What happens next | Owner | What it writes |
|---|---|---|
| The wireframes are reviewed by a human | `int-gate` stage (`../stelow-workflow-orchestrator/stages/int-gate.md`) | `interfaces/alternatives.approved.md` |
| The interface is chosen | `selection` stage (`../stelow-workflow-orchestrator/stages/interface-selection.md`) | `interfaces/selected-interface.md` |
| The chosen interface is mapped | the same `selection` stage, per `../stelow-workflow-orchestrator/references/breadboard.md` | `interfaces/breadboard.json` |

So in workflow mode: finish `interfaces/alternatives.md` (every proposal with
its own wireframe, plus the hybrid), emit the hand-off block below, and stop.
The router advances to `int-gate`; the pick and the map happen after it.

The next stage submits `interfaces/alternatives.md` to `visual_review` — see
`../stelow-workflow-orchestrator/references/cli-tools/visual_review.md` for the
command — and the stage after that asks the pick question with Pattern 2 from
`../stelow-workflow-orchestrator/stages/ask-patterns.md`. Both instructions
live in their own playbooks, not here: this skill's job is to leave the file
they act on in a state worth reviewing.

**Standalone mode is different.** There is no gate and no `selection` stage,
so a human who asked you to explore directions may simply pick one. Even then,
do not write `selected-interface.md`, `breadboard.json`, or a review receipt:
those are workflow artifacts, and a hand-written one is a file the workflow
will never read.

### Who owns what after the proposals

The per-proposal trade-off and smell audit are the proposal's own rationale —
they belong to divergence. The decision-level trade-off, the accepted
sacrifice, and the evidence belong to `stelow-workflow-interface-contrast`
(convergence). A post-build UX audit belongs to
`stelow-workflow-ux-critique`. Do not restate the decision record here, and do
not re-audit a proposal against the smells after the contrast has already
weighed it.

## Output

Interface proposals are saved to:
```
.stelow/{YYYY-MM-DD}/{_dir}/interfaces/alternatives.md
```

The recipe records the same proposals as structured data next to the
document:
```
.stelow/{YYYY-MM-DD}/{_dir}/interfaces/alternatives.json
.stelow/{YYYY-MM-DD}/{_dir}/interfaces/alternatives-verification.json
```

The chosen interface (after the pick) is saved to:
```
.stelow/{YYYY-MM-DD}/{_dir}/interfaces/selected-interface.md
```

and its structured map to:
```
.stelow/{YYYY-MM-DD}/{_dir}/interfaces/breadboard.json
```

Both are written by the **Selection** stage, not here: the pick and the map
describe ONE chosen interface, and a map of five alternatives is noise. See
`../stelow-workflow-orchestrator/stages/interface-selection.md` and
`../stelow-workflow-orchestrator/references/breadboard.md`.

Completeness contract (the host validates these minima — never submit fewer,
per proposal; proposal count follows exploration breadth):
all 8 numbered sections per `references/output-format.md` (Work Pattern,
Philosophy, Breadboarding, ASCII sketch, Interaction Flow, Trade-Off,
Smell Audit, State Coverage Table); at least 800 words.

criteria:
  - id: proposal-sections
    kind: count
    text: "All 8 numbered sections per proposal per output-format"
  - id: word-count
    kind: count
    text: "At least 800 words"
  - id: tradeoff-decisiveness
    kind: semantic
    text: "Trade-Off sections recommend one direction with reasons, not lists of pros and cons"

## When to Use & Test Cases

Use when exploring interface directions before any code, or merging proposals into a hybrid.

Should activate: "3 directions for onboarding UI", "hybrid from these proposals".
Should NOT activate: "implement the chosen direction" (execution).

## Examples

### Example 1: Three onboarding directions

**Input:** "Propose 3 interface directions for team onboarding."

**Steps:**
1. Generate 3 proposals with all 8 sections each.
2. Build the hybrid from their strengths after all 3 complete.

**Output:** 3 proposal files plus a hybrid recommendation.

## Edge Cases

### Breadth allows one proposal only
- Generate exactly 1 proposal; skip the hybrid (nothing to combine).

### No existing UI to review
- Derive state coverage from the request alone; mark unmapped states explicitly instead of inventing screens.

## Related Skills

- **stelow-workflow-shape-up**: Produces the shaped proposal that feeds this phase
- **stelow** (orchestrator): Coordinates this skill with other phases

## Input Detection (Standalone Mode)

When called outside the workflow with no pre-existing spec-product.md:

```
Input:
  ├── User provided a spec-product*.md path?
  │   └→ Read its IN/OUT scope and solution description
  ├── User described the feature verbally?
  │   └→ Extract: what does the user need to accomplish?
  └── No structured input?
      └→ Ask: "What interface do you want to explore? Describe
         what the user needs to do, and any constraints (platform,
         existing UI patterns, brand guidelines)."
```

Then follow the breadth-selected archetype generation process above.

## Environment Adaptation

If a tool is unavailable, check:
`references/cli-tools/`

<!-- stelow:scope3:begin -->
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
stage          : interface
description    : Interface exploration + reaction-first contrast. Generates bounded alternatives with wireframes, preserves the first reaction, compares them, and emits a named disposition.
status         : <done|partial|blocked>
artifacts      : <paths created or modified>
next-candidate : <the stage scripts/stelow next reports — run `scripts/stelow next`>
gate           : none
rework-on      : scope
```

Workflow mode: emit the above Hand-off block verbatim, then stop. Fill
`next-candidate` from `scripts/stelow next`: it is the workflow's own
answer, already accounting for this run's intent route and review mode.
The router skill consumes the next-candidate field and calls
`scripts/stelow advance <next-candidate>` to move state forward.

### Workflow slice

Workflow mode for the **interface** stage. Standalone behavior lives in
the rest of this file (unchanged). Summary:

> Interface exploration + reaction-first contrast. Generates bounded alternatives with wireframes, preserves the first reaction, compares them, and emits a named disposition.

Primary actions (per stages.yaml): `read, write`. Run only the actions that
produce the artifacts promised in `## Hand-off`; skip anything that does
not advance the workflow.

<!-- stelow:scope3:end -->

