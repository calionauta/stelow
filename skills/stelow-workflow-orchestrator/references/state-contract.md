# State Contract

This document defines the canonical state model for the stelow skills-only
workflow. It is the authoritative reference for humans and LLMs editing or
reading workflow state files.

---

## Files

| File | Location | Authored by |
|---|---|---|
| `state.md` | `$STELOW_STATE`, or `<git-root>/state.md` when unset | LLM (content fields) + `stelow advance` (stage transitions) |
| `invariants.json` | `$STELOW_STATEDIR/invariants.json`, or `<git-root>/.stelow/invariants.json` when unset | `stelow advance` only |

Standalone workflows use the project root. Hosts that run concurrent workflows
must set `STELOW_STATE` (and normally `STELOW_STATEDIR`) to a per-workflow
directory; the helper must never fall back to another workflow's root state.

---

## state.md

### Purpose

Single human-readable + LLM-editable state file. Tracks workflow name, intent,
config, current stage, completed stages, artifact paths, and history.

### Format

YAML frontmatter + body markdown.

```yaml
---
name: payroll-pipeline
intent: feature          # new-product | feature | bugfix | refactor | investigate | unknown
current_stage: shape     # single string, always one of the stage names below
status: active           # active | paused | archived | completed
config:
  appetite: Core          # Lean | Core | Complete
  review_mode: "Auto"     # Auto | "Product Spec Gate" | "Product Spec + Interface + Scopes" | "Product Spec + Interface + Tech Review + Code Diff"
  product_type: software  # software | docs | infra | data | research
stages:
  setup: done
  context: done
  shape: in-progress
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
artifacts:
  spec-product: .stelow/2026-08-13/abc123/plans/spec-product_v1.md
  spec-tech: .stelow/2026-08-13/abc123/plans/spec-tech_v1.md
  scope-report: .stelow/2026-08-13/abc123/plans/scope-report_v1.md
history:
  - stage: setup
    at: 2026-08-13T09:00:00Z
    status: done
  - stage: context
    at: 2026-08-13T09:30:00Z
    status: done
---
```

### Valid Stage Names

`triage`, `select`, `setup`, `context`, `shape`, `critique`, `gate`,
`scope`, `interface`, `int-gate`, `selection`, `planning`,
`plan-gate`, `execution`, `verification`, `diff-gate`, `audit`.

### Valid Stage Statuses

`pending` | `in-progress` | `done` | `skipped`.

### Valid Intent Values

`new-product` | `feature` | `bugfix` | `refactor` | `investigate` | `unknown`.

### Valid Review Modes

`Auto` | `Product Spec Gate` | `Product Spec + Interface + Scopes` |
`Product Spec + Interface + Tech Review + Code Diff`.

### Authorship Rules

| Field group | Written by |
|---|---|
| `name`, `intent`, `config.*`, `artifacts.*`, `history` | LLM |
| `current_stage`, `stages.*`, `status`, `history` (entries) | `stelow advance` only |
| `artifacts` entries | LLM declares; `stelow advance` enforces existence before transition |

**The LLM must never hand-write a stage transition.** Use `stelow advance <stage>`
to change `current_stage` or `stages.*`.

**The LLM must never edit `invariants.json` directly.** Only `stelow advance`
writes it.

---

## invariants.json

### Purpose

Machine-checkable bookkeeping for scope records, discovered tasks, and the
spec-tech artifact path. Used by `execution-critique` and `stelow doctor`.

### Location

`<git-root>/.stelow/invariants.json`

### Schema

```json
{
  "$schema": "stelow-invariants-v1",
  "version": "1.0.0",
  "updated": "<ISO-8601 timestamp>",
  "spec_tech_file": "<path or null>",
  "scopes": [
    {
      "id": "<scope-id>",
      "status": "pending | in-progress | completed | skipped | failed",
      "record": {
        "completed_at": "<ISO-8601 or empty>",
        "files_count": 0,
        "commands_count": 0,
        "verified": false,
        "suggested_commit": "<string or null>"
      },
      "discovered_tasks_count": 0,
      "tasks": [
        {
          "id": "<task-id>",
          "name": "<task-name>",
          "source": "planned | discovered",
          "status": "pending | done | skipped",
          "discovered_in_iter": "<number or absent>",
          "components": ["<component>"] | null,
          "risk": 1,
          "note": "<string or null>"
        }
      ]
    }
  ]
}
```

### Field Rules

| Field | Type | Required | Rule |
|---|---|---|---|
| `record.completed_at` | string | yes | ISO-8601; empty string `""` if not completed |
| `record.files_count` | number | yes | >= 0 |
| `record.commands_count` | number | yes | >= 0 |
| `record.verified` | boolean | yes | |
| `record.suggested_commit` | string\|null | yes | commit message hint or null |
| `tasks[].source = "discovered"` | — | — | `note` is **required** |
| `discovered_tasks_count` | number | no | >= 0 when present |

---

## Worked Example

See `assets/state-template.md` for a full `state.md` template.
See `assets/invariants-example.json` for a complete `invariants.json` example.

---

## Anti-Drift Rules

- One canonical state path per workflow: `$STELOW_STATE` / `$STELOW_STATEDIR`
  when supplied; otherwise `<git-root>/state.md` / `<git-root>/.stelow/invariants.json`.
- **No mirrors.** No generated `index.json`, `status.json`, or per-workflow
  state copies.
- `stelow doctor` compares `state.md` artifact paths against on-disk
  directories to detect orphans and drift.
- `stelow doctor` checks for stale or parallel locks in `.stelow/locks/`.

---

## Locking

Concurrent session safety: `stelow advance` acquires a POSIX `mkdir`-based
lock with the configurable `STELOW_LOCK_TTL_SEC` (120 seconds by default)
before writing. If the lock directory exists and is not stale, the advance
fails with a clear message and no mutation occurs.

Lock directory: `$STELOW_STATEDIR/lock/`, or `<git-root>/.stelow/lock/` in
standalone mode.

---

## Rollback

If a `stelow advance` corrupts state, restore from git:

```bash
git checkout HEAD -- state.md .stelow/invariants.json
```

This works because both files are git-tracked. A revert to the previous
`stelow advance` is also available: `git revert <sha>` (since each advance
is a separate commit).
