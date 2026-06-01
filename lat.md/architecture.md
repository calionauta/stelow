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
