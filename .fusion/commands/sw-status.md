---
name: sw-status
description: Show active workflow status
usage: /sw-status
host: fusion
---
# /sw-status

Show active workflow status

Usage: `/sw-status`

## Fusion dispatch

This file is an executable agent command prompt; Fusion does **not** load the
Pi extension adapter at runtime.

1. Read `skills/stelow-product-orchestrator/SKILL.md` and the current
   project `stelow.json`.
2. Execute the `sw-status` operation described in
   `cli-agents/COMMANDS.md`, preserving the command arguments supplied
   after `/sw-status`.
3. Use Fusion-native tools where the skill names an agnostic tool:
   `ask_user_question` → `fn_ask_question`, `subagent` →
   `fn_spawn_agent`. Fusion has no native `visual_review`; write the
   documented fallback receipt at
   `.stelow/approvals/{dirHash}/{file}.approved.md`.
4. Persist workflow state in project-root `stelow.json`; do not move it
   into `.fusion/`.

For first-time Fusion setup, validate
`.fusion/workflows/stelow-v2.json` with `fn_workflow_validate`, then
register it with `fn_workflow_create`. Do not bypass Fusion validation.
