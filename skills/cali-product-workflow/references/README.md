# References Index

This directory contains reference files used by the cali-product-workflow stages.
All paths below are relative to `skills/cali-product-workflow/references/` (or `~/.agents/skills/cali-product-workflow/references/`).

## CLI Tools (`cli-tools/`)

| File | Purpose |
|------|---------|
| `cli-tools/goals.md` | Goal creation, optimization goals, pause/tweak |
| `cli-tools/intercom.md` | Inter-session communication |
| `cli-tools/plannotator.md` | Plannotator gate command + after-approval workflow |
| `cli-tools/safe-change.md` | Safe-change tool reference |
| `cli-tools/stage-status.md` | Status display, `/pw-next`, `/pw-setphase` |
| `cli-tools/structured-question.md` | `ask_user_question` pattern reference |
| `cli-tools/subagents.md` | Subagent delegation patterns |
| `cli-tools/supervise.md` | Supervisor activation during execution |
| `cli-tools/todo.md` | Task management tool reference |

## Other References

| File | Purpose |
|------|---------|
| `capabilities.md` | Capability reference (informational only) |
| `output-expectations.md` | Expected outputs per stage |
| `permissions.md` | Tool permissions and stage restrictions |
| `strategic-exploration.md` | Strategic approach details |

## Key Stage Files (sibling to `references/`)

| File (relative to skill root) | Purpose |
|------|---------|
| `stages.yaml` | Stage metadata, blocked/allowed tools per stage |
| `stages/` | All stage instruction files (`setup.md`, `ask-patterns.md`, etc.) |
| `SKILL.md` | Orchestrator skill — entry point |

## Common Path Mistakes (what NOT to use)

| Wrong path | Correct path | Why it fails |
|------------|-------------|--------------|
| `references/stages.yml` | `stages.yaml` (skill root) | Wrong extension (`.yml` vs `.yaml`) + wrong directory |
| `references/workflow.md` | `SKILL.md` (skill root) | File does not exist |
| `stages/ask-patterns.md` (as `references/../stages/ask-patterns.md`) | `stages/ask-patterns.md` | Resolve paths relative to skill root, not `references/` |
