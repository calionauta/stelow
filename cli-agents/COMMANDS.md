# Command and Host Guide

Stelow's workflow and 25 skills are host-agnostic and **skills-only**: there is
no host adapter code in the repo. `stages.yaml#tools` defines a canonical tool
vocabulary (`ask_user_question`, `visual_review`, `subagent`, ...) and
per-host invocation syntax is documented in `references/cli-tools/*.md` inside
each skill.

## Workflow commands

`/sw-*` commands are skill-provided entry points routed by `stelow-entry`
(start/classify) and `stelow-router` (advance/load next stage). They work on
every agentskills-compatible agent — nothing registers them on a host.

## State mechanics

`scripts/stelow` is the portable helper every host shells out to:
`status [--json]`, `advance <candidate>`, `doctor [--json]`. It needs only
`bash` + `python3` and enforces transitions against
`skills/stelow-product-orchestrator/references/transitions.md`.

## Host activation

- **Marker protocol:** set `STELOW_WORKFLOW=1` + `STELOW_STATE=<path>` to
  load the workflow automatically (see `skills/stelow-entry/references/host-levers.md`).
- **Visual review:** `visual_review` writes portable approval receipts under
  `.stelow/approvals/{dirHash}/{file}.approved.md`.
- **Scheduling/automation:** host-owned (background tasks / cron / autopilot).
  No `pulse.sh`, no inbox mirror.

## Adding a new host

No code is required. Any agent that reads agentskills.io skill directories
(`~/.agents/skills/<name>/SKILL.md`) can run the workflow. To add host
vocabulary (e.g. a new native tool), document it in the tool's
`references/cli-tools/<tool>.md` file — skills must never call host-native
tool names directly in prose.