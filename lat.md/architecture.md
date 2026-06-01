# Architecture

System architecture, component relationships, and design patterns for cali-product-workflow.

## System Layers

The system follows a 4-layer architecture. It separates concerns so each layer only depends on the layer below it.

```
┌─────────────────────────────────────────────────────────────┐
│  SKILL (cali-product-workflow)                             │
│  - /pw-start, /pw-next, /pw-inbox, /pw-todo               │
│  - Phase instructions (triage, shape, gate, etc.)         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  EXTENSION (extensions/cali-product-workflow)               │
│  - State management                                        │
│  - Commands (/pw-inbox, /pw-todo)                          │
│  - UI (footer, overlays)                                   │
│  - Lifecycle hooks (onTurnEnd, resume)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  MODULES (extensions/.../modules/)                         │
│  - File persistence (JSON, Markdown)                       │
│  - Cache management                                        │
│  - Task types                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  FILESYSTEM                                                │
│  .cali-product-workflow/                                   │
│  ├── inbox/items.md          # Deferred items              │
│  ├── {date}/{hash}/                                          │
│  │   ├── phase-todos.json    # Current phase tasks         │
│  │   ├── index.json          # Workflow metadata          │
│  │   └── tracking.json       # Local tracking             │
│  └── cali-product-workflow.json  # Global tracking         │
└─────────────────────────────────────────────────────────────┘
```

### Skill Layer

The orchestrator skill coordinates all sub-skills and reads stage files from `stages/` to delegate to specialized skills.

### Extension Layer

The Pi extension provides state management, command handlers, UI components, lifecycle hooks, and CLI adapters.

### Module Layer

Reusable modules provide typed file persistence (`TextFileStore`, `JsonFileStore`, `MarkdownFileStore`), in-memory cache with file backup (`CacheManager`, `MapCache`), and shared task types.

## Skill Auto-Sync (Pi Extension)

On every `session_start`, the Pi extension mirrors project skills into the user's `~/.agents/skills/`.

The flow lives in `syncSkillsFromClone` (`extensions/cali-product-workflow/index.ts:120`) and is optimized with a git HEAD hash marker file (~/.agents/skills/.cali-skill-sync-hash):

- **HEAD unchanged** → fast path, no-op (<15ms)
- **HEAD changed** → full sync: `rm -rf` + `cp -r` for each active skill (~110ms)

### Prune Rules

A skill in `~/.agents/skills/` is removed if ALL hold:

1. Its name matches a `knownPrefixes` entry (we own it — e.g. `cali-product-`)
2. It is NOT in the current `skills/` of the clone
3. It is NOT in `skills/cali-product-workflow/retired-skills.yaml`

The retired allow-list lets us clean up skills that were *removed in prior releases* — without that list, the prune loop would also be satisfied by "this skill was just deleted from the project", but we'd lose the ability to actively *remove* the stale copy on a user machine that hasn't synced since the skill existed.

### Retired Skills Registry

Single source of truth for retired skill names, kept in `skills/cali-product-workflow/retired-skills.yaml`. Format:

```yaml
version: 1
retired:
  - name: cali-product-critique
    retired_at: 2026-05-29
    reason: superseded  # superseded | renamed | merged | deleted | experimental
    superseded_by: [cali-product-plan-critique, ...]
    note: free-form context for humans
```

Only `name` is required; all other fields are documentation. The file is **not** a skill (no `SKILL.md`) — it lives inside the orchestrator skill folder for organization but the sync does not copy it to `~/.agents/skills/`.

### Testable Module Pattern

Pure helpers used by the sync are extracted to `extensions/cali-product-workflow/sync-skills.ts` so they can be unit-tested without spinning up the Pi runtime. See `getRetiredSkillNames` (extracted from `index.ts` in commit `018ebb1`).

## Stage Numbering Convention

All stages use gap-based hierarchical numbering. Pre-steps use `0.` prefix with gaps of 10.

```
<stage-slug>:<major>        — Major step (gaps of 10)
<stage-slug>:<major>.<minor> — Sub-step (gaps of 10 on decimal scale)
```

Example: `setup:10`, `setup:10.10`, `setup:20`, `setup:0.10`.

Slugs come from `stages.yaml` — the single source of truth.

## Stage Index

The master list of all 15 workflow stages that enforces execution order and auto-discovery by slug pattern.

Defined in `stages.yaml`. Executes from `triage` through `audit` — no stage can be skipped or reordered.

See [[business-rules#Workflow Stages]] for the full stage sequence and rules.

## CLI Adapter Pattern

The extension uses a CLI adapter pattern to support multiple coding agents (Pi, OpenCode, Claude Code, Codex). Each adapter implements a common interface from `adapters/base.ts`.

The dispatcher (`adapters/commands/dispatcher.ts`) routes commands through `getCommandSystem()` to the appropriate handler based on the detected CLI. See [[decisions#ADR-1: CLI Adapter Pattern]] for the rationale.

## Convention Over Config

The system auto-discovers components by directory structure. No configuration files needed — structure IS the configuration.
