# Hosting stelow

stelow is **skills + one CLI**. There is no host adapter code in this repo —
any host that meets the contract below can run it, wrap it, or build a visual
layer on top (like [bb-plugin-stelow](https://github.com/calionauta/bb-plugin-stelow)).

## What a host provides

| Capability | Required? | Notes |
|---|---|---|
| Skill directories (`~/.agents/skills/<name>/SKILL.md`, agentskills.io) | ✅ | How workers load the 28 skills |
| Delegate/subagent capability (any tier: acceptance-native, isolated, headless, generic — see `skills/stelow-workflow-orchestrator/references/cli-tools/subagents.md`) | ✅ | At minimum the generic tier (same-session + files) |
| Workflow activation (`STELOW_WORKFLOW=1` + `STELOW_STATE=<path>`) | ✅ | Recipes per harness: `references/host-levers.md` |
| Scheduler / inbox surface | ❌ optional | Host-owned (background tasks, cron, autopilot). The bb plugin is the reference implementation |
| Native review UI for `visual_review` | ❌ optional | Fallback is portable approval receipts under `.stelow/approvals/` |

## What a host consumes (the contract)

1. **Skills content** — 14 `stelow-workflow-*` (delivery machinery) + 14
   `stelow-product-*` (reference playbooks). Vendor them, sync them from this
   repo's `main`, or install via `npx skills add calionauta/stelow -g`.
2. **`scripts/stelow` semantics** — `status`, `advance`, `doctor`, `seed`,
   `schema`, `ask`. Usage errors exit 2, runtime failures exit 1. No npm
   dependencies (bash + python3).
3. **Stage slugs + transitions** — the 17 stages in
   `skills/stelow-workflow-orchestrator/references/transitions.md`
   (generated from `stages.yaml` via `scripts/generate-transitions.py`).
   `scripts/stelow advance` enforces them; hosts must not hand-edit
   `current_stage`.
4. **Approval receipts** — `.stelow/approvals/{dirHash}/{gate,int-gate,plan-gate,diff-gate}-approved.md`.
   A receipt is evidence of approval, never a state transition by itself.
5. **State files** — `stelow.json` (tracking) + `state.md` per workflow.
   Schema: `stelow.schema.json`.
6. **Tool vocabulary** — `stages.yaml#tools`
   (`ask_user_question`, `visual_review`, `subagent`, `read`, `write`,
   `edit`, `bash`, `grep`, `ls`, `agent_browser`). Skills never name
   host-native tools directly in prose; new harness vocabulary goes in the
   tool's `skills/stelow-workflow-orchestrator/references/cli-tools/<tool>.md`.

## Adding a new host

No code is required in this repo. An agent that reads agentskills.io skill
directories can run the workflow today; a visual host wraps the contract
above (board/inbox/CLI) the way `bb-plugin-stelow` does.

## Reference implementation

`bb-plugin-stelow` vendors the 14 workflow skills + `scripts/stelow` and
auto-syncs them from this repo; product playbooks come from the skills hub.
Its `workflow-contracts` test pins the shared surface (17 stages, board
order, transitions) — the executable version of this contract.
