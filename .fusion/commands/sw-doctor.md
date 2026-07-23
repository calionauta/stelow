---
name: sw-doctor
description: Diagnose workflow tracking health
usage: /sw-doctor
host: fusion
---
# /sw-doctor

Diagnose workflow tracking health

Usage: `/sw-doctor`

## Fusion dispatch

This file is an executable agent command prompt; Fusion does **not** load the
Pi extension adapter at runtime.

1. Read `skills/stelow-product-orchestrator/SKILL.md` and the current
   project `stelow.json`.
2. Execute the `sw-doctor` operation described in
   `cli-agents/COMMANDS.md`, preserving the command arguments supplied
   after `/sw-doctor`.
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
