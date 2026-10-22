---
name: stelow-workflow-router
description: >
  [stelow] Workflow router. Reads state.md, consumes the previous skill's
  ## Hand-off block, validates next-candidate against transitions.md,
  advances via scripts/stelow, and loads the next stage skill. Rejects
  unknown candidates; the rework path returns to the previous stage.
  Loaded by the host on every stage hand-off.
metadata:
  frequency: per-stage
  category: workflow
  execution:
    mode: direct
    recipe: null
    capabilities: []
    write_policy: none
    permission_profile: inherit
  context-cost: low
  author: calionauta
---

# Router

The router is the workflow **control plane**. It runs once per stage
transition. It does not implement any stage logic itself; it only moves
state forward and loads the next stage skill.

## Contract

Input:

- `state.md` (workflow state with `current_stage` set)
- The previous skill's `## Hand-off (workflow mode)` block
- `STELOW_WORKFLOW=1` + `STELOW_STATE=<path-to-state.md>` markers

Output:

- `state.md` advanced (via `scripts/stelow advance <next-candidate>`)
- The next stage's `SKILL.md` loaded for the next agent turn
- A new `## Hand-off (router)` block appended to `state.md`

## Algorithm

```bash
# 1. Ask the helper what is legal from here. The helper owns the rule: the
#    intent route, the review-mode policy and the graph all live in
#    stages.yaml, and it is the only implementation of them. Re-deriving the
#    set here was a FOURTH implementation — coarser than the helper's (no
#    intent route, no review mode) — and it accepted moves the helper then
#    refused (`diff-gate` in Auto), so the workflow stalled between the two
#    answers.
current=$(scripts/stelow status --json | jq -r .current_stage)
next=$(extract_hand_off_field next-candidate)

# 2. Validate next against the helper's own answer.
allowed=$(scripts/stelow next --json | jq -r '.allowed[]')
forward=$(scripts/stelow next --json | jq -r '.forward[]')
if ! echo "$allowed" | grep -qx "$next"; then
  echo "router: rejected '$next' (allowed from $current: $allowed)"
  # The forward move is the way out: it is the successor of the current
  # stage, with every stage this review mode skips already accounted for.
  next=$(echo "$forward" | head -1)
  if [ -z "$next" ]; then
    echo "router: no forward move from $current — the workflow is done or blocked"
    exit 1
  fi
  echo "router: taking the forward move '$next'"
fi

# 3. Advance state and load next stage.
scripts/stelow advance "$next"

# 4. Append router Hand-off (audit).
cat >> "$STELOW_STATE" <<EOF
## Hand-off (router) — $(date -Iseconds)
from        : $current
to          : $next
skill loaded: stelow-product-$next
EOF
```

## Reject / rework path

If `next` is not in the allowed list:

- Take the helper's **forward** move — the successor of the current stage,
  with every stage this review mode skips already accounted for. The helper
  is the only implementation of that rule.
- If there is no forward move, the workflow is done or blocked: stop and say
  so. Never invent a transition.
- Record the rejection in `state.md` body so the next agent can see
  why it was bounced.

## Total load budget

≤ 5k tokens (per SCOPE-4 NFR). No domain logic, no copy from stage
skills — just the algorithm above plus the conventions below.

## Conventions

- Always use the absolute path to `scripts/stelow` resolved from
  `git rev-parse --show-toplevel`; do not assume cwd.
- The router never writes to `.stelow/invariants.json` directly —
  `stelow advance` is the only writer.
- The router never parses `transitions.md` itself. `scripts/stelow next`
  answers the question; a second parser is a second opinion that drifts.
- After `stelow advance` succeeds, kill the current tmux session and
  start a fresh one for the next stage (clean context).