---
name: sw-ls
description: List workflows
usage: /sw-ls | all | archived | path=DIR
host: fusion
---
# /sw-ls

List workflows

Usage: `/sw-ls | all | archived | path=DIR`

## Fusion dispatch

This file is an executable agent command prompt; Fusion does **not** load the
Pi extension adapter at runtime.

1. Read `skills/stelow-product-orchestrator/SKILL.md` and the current
   project `stelow.json`.
2. Execute the `sw-ls` operation described in
   `cli-agents/COMMANDS.md`, preserving the command arguments supplied
   after `/sw-ls`.
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
