# Stelow Architecture

## Overview

Stelow is a host-agnostic product-planning workflow. The repository contains 25
portable skills and 17 phases. Runtime state and commands live in
`extensions/stelow/`; host specialization is behind `CLIAdapter`.
See the [README](README.md) and [AGENTS.md](AGENTS.md) for the user-facing
and contributor views, and [`docs/design/host-agnostic-architecture.md`](docs/design/host-agnostic-architecture.md)
for the host-agnostic design rationale. Reference for the
[agentskills.io](https://agentskills.io/) standard, the
[Plannotator](https://plannotator.ai/) visual review tool, and the
[Pi](https://pi.dev) host.

```text
skills/ + stages.yaml (workflow content and tool vocabulary)
        ↓
extensions/stelow/ (state, schema, locking, phases, command registry)
        ↓ CLIAdapter
  Pi: adapters/pi/ (hooks, TUI, native slash commands, Plannotator)
  Fusion: adapters/fusion.ts (tool mapping and generated resources)
  Generic: adapters/generic.ts (safe fallback)
        ↓
plugins/fusion-plugin-stelow/ (compiled dependency-free Fusion package)
```

## State and artifacts

`stelow.json` at the project root is the sole canonical workflow state;
`~/.stelow-global.json` is the global catalog. Workflow artifacts live under
`.stelow/{date}/{dirHash}/` (specs, interfaces, plans, critiques and
checklists). There is no generated per-workflow `index.json` mirror. Portable
approval receipts are `.stelow/approvals/{dirHash}/{file}.approved.md`;
`.plannotator/approvals/` is Pi compatibility/history only. Fusion owns
`.fusion/` workflow/task persistence; Stelow owns `stelow.json` and `.stelow/`.

`state.ts` provides `JsonFileStore`, schema validation, checkpoints, events,
file locks, host detection (`detectHost()`), and recovery. `start.ts` creates
workflow artifact directories. `modules/index.ts` exports surviving shared
module utilities such as `TASK_ICONS`; do not document cache helpers that no
longer exist.

## Host adapters

`CLI`/`HostName` are the `"pi" | "fusion" | "generic"` union. Adapter factories
select the host after `detectHost()`. `stages.yaml` supplies canonical tool
vocabulary; adapters translate it (for example Pi's `ask_user_question` to
Fusion's `fn_ask_question`). Generic hosts receive skills and fallbacks but do
not register native `/sw-*` commands. The adapter is in-process; a host plugin
is a separate packaging boundary.

The Fusion package is prepared from the canonical skills and builders by
`scripts/prepare-fusion-plugin.ts`, then compiled by
`npm run build:fusion-plugin`. Its entry has no private Fusion imports. Full
runtime installation validates settings and workflow IR, installs 25 local skill
trees and project artifacts, registers one managed project-scoped workflow,
and is idempotent and fail-closed on collisions. Installation rollback restores
previous bytes and removes only transaction-created empty directories.
See [`plugins/fusion-plugin-stelow/README.md`](plugins/fusion-plugin-stelow/README.md)
and [`docs/design/fusion-integration-facts.md`](docs/design/fusion-integration-facts.md).

## Workflow phases

The source of truth is `PHASE_NAMES` in `extensions/stelow/types.ts`, with
transitions and conditional review gates in
`skills/stelow-product-orchestrator/stages.yaml`:

`Triage`, `ItemSelect`, `Setup`, `Context`, `Shape`, `Critique`, `Gate`, `Scope`,
`Interface`, `Int.Gate`, `Selection`, `Planning`, `Plan.Gate`, `Execution`,
`Verification`, `Diff.Gate`, `Audit` (indices 0–16).

`Gate`, `Int.Gate`, `Plan.Gate`, and `Diff.Gate` are conditional by review mode;
the unconditional “never skip” rule from pre-v0.55 is gone. Execution is
phase 13, Verification 14, and Audit 16. See [`stages.yaml`](skills/stelow-product-orchestrator/stages.yaml)
for the canonical transitions.

## Commands

`WORKFLOW_COMMANDS` in `extensions/stelow/adapters/commands/dispatcher.ts` is
the registry of 19 descriptors. Pi exposes all 19 natively. Fusion emits the
16 descriptors whose `piOnly` flag is false. Generic hosts have no native
command registry and use the orchestrator skill/fallback path. The registry is
the authoritative command inventory; it includes `/sw-recover` and
`/sw-audit`.

## Extending the system

1. Add host-agnostic behavior to the core and update schemas/tests.
2. Add host-specific behavior under the matching adapter; do not import Pi
   primitives into Fusion or generic code.
3. Update `stages.yaml` tool mappings and command descriptors when applicable.
4. Run `npm run version:sync`, `npm run prepare:fusion-plugin`, and the targeted
   contract tests. Keep generated plugin output out of hand-authored guides.

The thin `extensions/stelow/index.ts` bootstrap delegates registration to the
selected adapter. Design rationale is in
[`docs/design/host-agnostic-architecture.md`](docs/design/host-agnostic-architecture.md).
