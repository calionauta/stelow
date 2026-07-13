# Scopes, Tasks & Records — Execution Model

> **Covers:** the three-layer runtime model for scope execution: what's planned up front, what emerges during building, and what proves it happened.

## Why three layers

Shape Up's core insight: **scope boundaries are set before execution, but the work inside them is discovered as you build.** Stelow models this with three distinct layers:

```
┌──────────────────────────────────────────────────────┐
│  Scope (committed at planning)                       │
│  ├── Appetite ceiling: Lean ≤2, Core ≤5, Complete ~10│
│  ├── target_files, DoD, ACs                          │
│  ├──────────────────────────────────────────────┐    │
│  │  Task (checklist, emerges during execution)   │    │
│  │  ├── planned: from spec-tech.md table at seed │    │
│  │  ├── discovered: added by LLM with note:why  │    │
│  │  └── status: pending → done | skipped         │    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │  Record (evidence, captured at scope close)   │    │
│  │  ├── files touched (git diff --name-only)     │    │
│  │  ├── commands run (verify/vet commands)       │    │
│  │  ├── verification checklist (ACs × done)      │    │
│  │  ├── limitations / non-claims (honest scope)  │    │
│  │  └── suggested_commit                          │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

| Layer | Created by | When | Mutability | Stored in | Purpose |
|---|---|---|---|---|---|
| **Scope** | Tech-planning subagent | Planning time | **Frozen** after spec-tech.md | `wf.scopes[i]` in stelow.json | Atomic delivery unit. Cannot be changed mid-cycle. |
| **Task** | Scope-executor (planner child LLM) | Execution time | **Mutable** — planned can be marked done/skipped; discovered can be appended | `wf.scopes[i].tasks[]` | Sub-item checklist. The hill chart collapsed into one scope. |
| **Record** | Scope-executor at scope close | Close time | **Frozen** after close (v2 enforcement) | `wf.scopes[i].record` + `iteration-state-{SCOPE-ID}.md` | Claim-proof evidence. Without it, the ✅ is unearned. |

## Pipeline: from planning to close

```mermaid
flowchart LR
    A[Tech Planning<br/>planning:10] -->|spec-tech.md<br/>with Tasks table| B[Scope start<br/>Scope-executor 3c]
    B -->|seed tasks[]<br/>source='planned'| C[Iteration loop<br/>Scope-executor 3a-3b]
    C -->|discovered work?<br/>append source='discovered'| C
    C -->|acceptance met?| D[Scope close<br/>Scope-executor 3e]
    D -->|capture Record<br/>+ tasks snapshot| E[Audit<br/>Execution-critique]
    E -->|Criterion 6: Record| F{All gaps fixed?}
    E -->|Criterion 11: Tasks| F
    F -->|Yes| G[Close cycle]
    F -->|No (ESCALATED)| B
```

## Three skills, one model

| Skill | Handles | File |
|---|---|---|
| `stelow-product-tech-planning` | Generates scopes + planned tasks table in spec-tech.md | `skills/stelow-product-tech-planning/SKILL.md` |
| `stelow-product-scope-executor` | Seeds tasks, appends discovered, marks done/skipped, creates Record at close | `skills/stelow-product-scope-executor/SKILL.md` (Steps 3a-3e, 3e-bis, 3e-ter) |
| `stelow-product-execution-critique` | Criterion 6 (Record) + Criterion 11 (Tasks Tracking) — audits both layers | `skills/stelow-product-execution-critique/SKILL.md` |

## Field status

| Field | Status |
|---|---|
| `scope.record` | Required for `status: 'completed'`. Runtime validation ON by default. Pre-commit hook blocks commits with missing records. |
| `scope.tasks` | Optional. Checked by execution-critique Criterion 11. No write-time block (tasks are a checklist, not proof). |
| `scope.discovered_tasks_count` | Bash-incremented counter. Validated when present by `schema-record.ts`. |

## Rules of thumb

- **If a discovered task grows large enough to be a delivery unit**, ESCALATE it as a new scope in the next cycle. Do not bloat the current scope.
- **If `discovered_tasks_count > 5`**, the scope was probably under-planned. Surface in Lessons Learned — don't block close.
- **If a scope closed with no tasks and no Record**, it's unauditable. The doer may have done good work, but the system cannot prove it. Block.
- **If a scope closed with all tasks `status: 'pending'`**, the executor skipped tracking. Either the scope was trivially small (do-nothing pattern), or tracking failed. Investigate.
- **Discovered tasks without `note:`** are rejected at write time (validation is ON by default). When `STELOW_VALIDATE=0`, the runtime validator skips the check; execution-critique Criterion 11 still warns about them.
