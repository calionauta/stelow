# Workflow State Template

This file is the starting point for a new stelow workflow.
It is created by `entry/SKILL.md` and is never manually created by the LLM
or user. Use `stelow advance <stage>` to change stage.

```
---
name: <workflow-name>
intent: <new-product|feature|bugfix|refactor|investigate|unknown>
current_stage: <stage-name>
status: active
config:
  appetite: Core
  review_mode: Auto
  product_type: software
stages:
  triage: pending
  select: pending
  setup: pending
  context: pending
  shape: pending
  critique: pending
  gate: pending
  scope: pending
  interface: pending
  int-gate: pending
  selection: pending
  planning: pending
  plan-gate: pending
  execution: pending
  verification: pending
  diff-gate: pending
  audit: pending
artifacts: {}
history: []
---
```

## Field Guide

- **name** — slug-style identifier for this workflow (e.g. `payroll-pipeline`)
- **intent** — the triggering intent; determines pipeline routing
  - `new-product` → full pipeline
  - `feature` → full pipeline
  - `bugfix` → minimal pipeline (context → shape → gate → execution → verification → audit)
  - `refactor` → reduced pipeline (setup → context → planning → plan-gate → execution → verification → audit)
  - `investigate` → triage → select → setup → context → audit
  - `unknown` → treat as `feature`
- **current_stage** — the active stage; updated by `stelow advance`
- **status** — `active` | `paused` | `archived` | `completed`
- **config.appetite** — `Core` (default) | `Large` | `Bite-sized`
- **config.review_mode** — `Auto` (default) | `Product Spec Gate` | `Product Spec + Interface + Scopes` | `Product Spec + Interface + Tech Review + Code Diff`
- **config.product_type** — `software` (default) | `docs` | `infra` | `data` | `research`
- **stages** — all 17 stage names; values: `pending` | `in-progress` | `done` | `skipped`
- **artifacts** — key-value map of `artifact-name: relative-path`; paths are relative to project root
- **history** — chronological log of stage completions; appended by `stelow advance`

## Valid stage names

`triage`, `select`, `setup`, `context`, `shape`, `critique`, `gate`,
`scope`, `interface`, `int-gate`, `selection`, `planning`,
`plan-gate`, `execution`, `verification`, `diff-gate`, `audit`.

## Rules

1. **Never hand-write a stage transition.** Use `stelow advance <stage>`.
2. **Never add artifact paths that do not exist on disk.** `stelow advance`
   validates artifact existence before allowing a transition that requires it.
3. **Never edit `.stelow/invariants.json` directly.** Only `stelow advance`
   writes it.
4. **Always use git-tracked paths for artifacts.** The artifact directory
   follows the pattern `.stelow/<date>/<dirhash>/plans/`.
