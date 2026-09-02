---
name: stelow-entry
description: >
  [stelow] Workflow entry point. Classifies the user's intent, scaffolds
  state.md from the template, and picks the first stage from
  transitions.md. Never runs stage logic itself — that is the router's
  job. Loaded only when STELOW_WORKFLOW=1 is set on the host (see
  references/host-levers.md).
metadata:
  frequency: per-workflow
  category: workflow
  context-cost: low
  author: calionauta
---

# Entry (intent classification + state scaffold)

This skill is the **first** thing a workflow-mode stelow session loads
(via the marker `STELOW_WORKFLOW=1`). It does **not** run stage logic.
Its only job is to bootstrap the workflow: classify intent, write
`state.md`, and pick the first stage.

## When to load

Load this skill when:

- The host has `STELOW_WORKFLOW=1` in its environment, AND
- `state.md` is missing OR the user wants to start a new workflow, AND
- The user has expressed an intent (one of: `new-product`, `feature`,
  `bugfix`, `refactor`, `investigate`).

If `STELOW_WORKFLOW` is unset, fall back to standalone skill loading
(legacy `/sw-*` and `/stelow-*` commands).

## Intent classification

Classify the user's request into one of:

| Intent | Marker | Examples |
|---|---|---|
| `new-product` | greenfield, no existing product, building from scratch | "build a billing system for X" |
| `feature` | brownfield, adding to existing product | "add a logout button" |
| `bugfix` | brownfield, fixing broken behavior | "the dashboard crashes on X" |
| `refactor` | brownfield, restructuring without behavior change | "extract this into a module" |
| `investigate` | exploratory, no commit intent | "what does our churn look like" |

If none of the above fits (or the user is ambiguous), ask once with
`ask_user_question` before scaffolding state.md. Do not guess.

## Scaffold state.md

Once intent is locked:

```bash
git_root=$(git rev-parse --show-toplevel)
state_path="${STELOW_STATE:-$git_root/state.md}"
cp "$git_root/assets/state-template.md" "$state_path"
# then fill the YAML frontmatter:
#   name: <short project name derived from intent>
#   intent: <one of the 5 above>
#   current_stage: setup   (first stage per transitions.md)
#   status: active
#   config:
#     appetite: <Lean | Core | Complete — derived from intent + scope>
#     review_mode: <Auto | Product Spec Gate | Product Spec + Interface + Scopes | Product Spec + Interface + Tech Review + Code Diff>
#     product_type: <software | docs | infra | data | research>
```

Then append a single `# <project name>` heading to the body so the file
is non-empty and `stelow status` renders.

## Pick the first stage

Look up `current_stage` from the canonical first stage in
`skills/stelow-workflow-orchestrator/references/transitions.md`. Today
that is `setup` for `feature`/`bugfix`/`refactor`/`investigate` and
`triage` for `new-product` (the new-product flow always starts with a
triage assessment).

Write `current_stage` into the scaffolded `state.md`. When `STELOW_STATE` is
set, it is the workflow's canonical state file; never substitute a root
`state.md` or a guessed per-card path.

## Hand off

After scaffolding, hand off to the router. Do **not** start running any
stage skill — the router will.

```
## Hand-off (entry)

stage          : setup  (or triage for new-product)
artifacts      : state.md  (created)
next-candidate : <first stage>
router         : load skills/stelow-router/SKILL.md next
```
