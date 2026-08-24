---
name: stelow-router
description: >
  [stelow] Workflow router. Reads state.md, consumes the previous skill's
  ## Hand-off block, validates next-candidate against transitions.md,
  advances via scripts/stelow, and loads the next stage skill. Rejects
  unknown candidates; the rework path returns to the previous stage.
  Loaded by host-levers.md on every stage hand-off.
metadata:
  frequency: per-stage
  category: product
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
# 1. Read current_stage and the previous skill's Hand-off block.
current=$(scripts/stelow status --json | jq -r .current_stage)
next=$(extract_hand_off_field next-candidate)

# 2. Validate next against transitions.md.
transitions=skills/stelow-workflow-orchestrator/references/transitions.md
allowed=$(awk "/^### $current\$/,/^### |\$/" "$transitions" \
            | grep -E "^(next|accept|rework):" \
            | head -1 | awk "{print \$2}" | tr -d "[],\"")
if ! echo "$allowed" | grep -qw "$next"; then
  echo "router: rejected '$next' (allowed from $current: $allowed)"
  # rework path: return to previous stage
  prev=$(echo "$allowed" | head -1)
  scripts/stelow advance "$prev"
  load_skill "$prev"
  exit 1
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

- Default behavior: advance to the first `rework` candidate (or the
  `reject` candidate if no rework is defined) so the workflow can
  recover without manual intervention.
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
- After `stelow advance` succeeds, kill the current tmux session and
  start a fresh one for the next stage (clean context).