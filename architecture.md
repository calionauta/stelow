# stelow Architecture

## Overview

Product planning workflow system for AI coding agents. Shipped as a
**Pi-first** extension; the orchestrator skill + 24 partner skills work in
any agent that reads `~/.agents/skills/<name>/SKILL.md` (the
[agentskills.io](https://agentskills.io/) standard adopted by Pi, Claude
Code, Codex, Cursor, Continue, OpenCode, and others).

See `cli-agents/COMMANDS.md` for the extension guide and
`docs/archive/2026-07-09-deprecated-multi-cli-integration/` for the pre-v0.45.0
multi-CLI surface (kept for archaeology, not for use).

## System Layers

```
┌─────────────────────────────────────────────────────────────┐
│  SKILL (stelow)                             │
│  - /sw-start, /sw-next, /sw-inbox                        │
│  - Phase instructions (triage, shape, gate, etc.)         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  EXTENSION (extensions/stelow)               │
│  - State management                                        │
│  - Commands (/sw-inbox)                                     │
│  - UI (footer, overlays)                                   │
│  - Lifecycle hooks (onTurnEnd, resume)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  MODULES (extensions/.../modules/)                          │
│  - File persistence (JSON, Markdown)                       │
│  - Cache management                                        │
│  - Task types                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  FILESYSTEM                                                │
│  .stelow/                                   │
│  ├── inbox/items.md          # Deferred items              │
│  ├── {date}/{hash}/                                          │
│  │   ├── checklist.md        # Current phase tasks (markdown)        │
│  │   ├── index.json          # Workflow metadata          │
│  │   └── tracking.json       # Local tracking             │
│  └── stelow.json  # Global tracking         │
└─────────────────────────────────────────────────────────────┘
```

## Modules

### modules/file-store.ts

**Purpose:** Generic file read/write with automatic directory creation.

**Classes:**
- `TextFileStore` — Plain text files
- `JsonFileStore<T>` — JSON files with type safety
- `MarkdownFileStore` — Markdown with header support (skips `#` lines)

**Usage:**
```typescript
import { JsonFileStore } from './modules/file-store';

const store = new JsonFileStore<PhaseTodosData>('/path/to/file.json');
const data = store.read();   // returns null if not exists
store.write({ ... });        // creates dir if needed
```

### modules/cache.ts

**Purpose:** In-memory cache with optional file persistence.

**Classes:**
- `CacheManager<T>` — Single value cache with file backup
- `MapCache<K, V>` — Key-value cache

**Usage:**
```typescript
import { CacheManager } from './modules/cache';

const cache = new CacheManager<PhaseTodo[]>(
  () => loadFromFile(),   // optional load
  (data) => saveToFile(data)  // optional save
);
cache.set([...]);  // saves to file if callbacks provided
const todos = cache.get();  // from memory or file
```

### modules/task.ts

**Purpose:** Shared types for task management.

**Types:**
- `TaskStatus` — `"pending" | "in_progress" | "completed"`
- `TaskItem` — Base interface with optional id
- `PhaseTodo` — Task with required id (e.g., "SHAPE-1")
- `parseChecklist()` — Parse checklist.md to derive scope task counts
- `InboxItem` — Simple deferred item

**Utilities:**
- `TASK_ICONS` — { pending: "○", in_progress: "◐", completed: "✓" }
- `formatTask(task)` — "✓ [SHAPE-1] Shape proposal"
- `formatTaskList(tasks, header?)` — Multi-line formatted list

## Data Flow

### Inbox Flow

```
/sw-inbox add <item>
    ↓
cmdInbox() [commands.ts]
    ↓
addToInbox(cwd, item) [state.ts]
    ↓
readInbox(cwd) → MarkdownFileStore → inbox/items.md
```

### Todo Flow (LLM internal — see `todo` tool reference)

The LLM manages phase todos via the `todo` tool internally.
No CLI command needed.

```
todo tool → setPhaseTodos([...]) [state.ts]
```
    ↓
writePhaseTodos() [state.ts]
    ↓
LLM → checklist.md (markdown, Plannotator-visible)
```

### Resume Flow

```
Session Start
    ↓
detectActiveWorkflow() [index.ts]
    ↓
readPhaseTodos() → JsonFileStore
    ↓
setPhaseTodos() [state.ts - memory cache]
    ↓
LLM sees todos restored
```

## Convention Over Config

**Rules for automatic discovery:**

| Directory | Content | Auto-discovered |
|-----------|---------|-----------------|
| `commands/` | Command handlers | Yes |
| `skills/` | Phase instructions | Yes |
| `modules/` | Reusable code | Yes |
| `adapters/` | CLI adapters | Yes |

**If it exists in the right directory, it works.**

No config files needed. Structure IS the configuration.

## How to Add New Store

1. **Import from modules:**
   ```typescript
   import { MarkdownFileStore } from './modules/file-store';
   ```

2. **Create instance:**
   ```typescript
   const store = new MarkdownFileStore(
     '.stelow/my-feature/items.md',
     '# My Feature'
   );
   ```

3. **Use read/write:**
   ```typescript
   const items = store.read();  // string[]
   store.write(['item1', 'item2']);
   ```

## How to Add New Cache

1. **Import from modules:**
   ```typescript
   import { CacheManager } from './modules/cache';
   ```

2. **Create with callbacks:**
   ```typescript
   const cache = new CacheManager<MyType>(
     () => loadFromFile(),
     (data) => saveToFile(data)
   );
   ```

3. **Use get/set:**
   ```typescript
   cache.set(newData);
   const data = cache.get();  // from memory or file
   ```

## How to Add New Task Type

1. **Add to modules/task.ts:**
   ```typescript
   export interface MyTask extends TaskItem {
     priority?: 'low' | 'medium' | 'high';
   }
   ```

2. **Update icons if needed:**
   ```typescript
   export const MY_TASK_ICONS: Record<string, string> = {
     low: '○',
     medium: '◐',
     high: '●',
   };
   ```

## File Locations

```
.stelow/
├── inbox/                   # User's deferred items
│   └── items.md            # Markdown, one item per line
├── {date}-{hash}/          # Workflow-specific
│   ├── index.json          # { workflowName, phase, phaseIndex, updatedAt }
│   ├── checklist.md    # # Phase\n- [x] task1\n- [ ] task2
│   ├── specs/              # Spec documents
│   ├── interfaces/         # Interface explorations
│   ├── plans/              # Technical plans
│   └── critiques/          # Review outputs
├── stelow.json   # Local tracking
└── cali-pw-global.json      # Global tracking (home)
```

## Extensions

| File | Purpose |
|------|---------|
| `index.ts` | Lifecycle hooks (onTurnEnd, resume, etc.) |
| `commands.ts` | Command handlers (/sw-start, /sw-inbox, etc.) |
| `state.ts` | State management, uses modules |
| `ui.ts` | TUI components (footer, overlays) |
| `start.ts` | Workflow initialization |
| `adapters/` | CLI-specific adapters |

## Commands Reference

| Command | Description |
|---------|-------------|
| `/sw-start [idea]` | Start new workflow |
| `/sw-next` | Advance to next phase |
| `/sw-prev` | Go back to previous phase |
| `/sw-info [phase]` | Jump to specific phase |
| `/sw-inbox` | Show inbox items |
| `/sw-inbox add <item>` | Add to inbox |
| `/sw-inbox remove <item>` | Remove from inbox |
| `/sw-abort` | Abort and archive workflow |
| `/sw-archive` | Archive workflow |

## Phases

> **Source of truth:** `extensions/stelow/types.ts` — the `PHASE_NAMES` array.
> All other files reference this; never hardcode phase lists elsewhere.

| Index | Phase Name | Description |
|-------|------------|-------------|
| 0 | `Triage` | Inbox parsing, item extraction |
| 1 | `ItemSelect` | User picks item from ranked list |
| 2 | `Setup` | Project setup, stage selection, lessons injection |
| 3 | `Context` | Strategic exploration (optional, gated by `context:5` appetite/mode) + domain detection |
| 4 | `Shape` | Shape Up proposal with IN/OUT |
| 5 | `Critique` | Multi-dimensional adversarial critique |
| 6 | `Gate` | Plannotator visual review — never skip |
| 7 | `Scope` | Scope adjustment after gate approval |
| 8 | `Interface` | 5 archetypes + hybrid creation |
| 9 | `Int.Gate` | Interface Plannotator gate |
| 10 | `Selection` | User selects interface approach |
| 11 | `Planning` | Tech planning, typed scopes, dependency mapping |
| 12 | `Execution` | Autonomous scope execution: features with auto-iteration loop (`[MAX_ITERATIONS]`, verify→review→quality, escalate), optimization with benchmark iteration, spikes with research |
| 13 | `Verification` | Test suite, code review, UI audit, static analysis |
| 14 | `Audit` | Execution critique (scope, quality, NFRs, docs) |

For code, use `PHASE_NAMES` from `types.ts` and the `STAGE` enum — no hardcoded indices.
For the orchestrator skill, the complete Stage Index is in `skills/stelow-product-orchestrator/SKILL.md`.

## See Also

- `AGENTS.md` — Agent instructions
- `skills/stelow-product-orchestrator/references/cli-tools/todo.md` — Todo system docs
- `skills/stelow-product-orchestrator/SKILL.md` — Workflow instructions
---

## Future Refactor Path

### Phase 1: Use TASK_ICONS Consistently ✅ (Done)

`cmdTodo` now uses `TASK_ICONS` from modules:

```typescript
import { TASK_ICONS } from "./state"; // re-exported from modules

const icon = TASK_ICONS[todo.status];
```

### Phase 2: Use FileStore Classes (Optional)

Currently, `state.ts` uses raw `readFileSync`/`writeFileSync`. For cleaner code:

```typescript
// Current (state.ts)
export function writePhaseTodos(cwd: string, wf: Workflow, todos: PhaseTodo[]): void {
  const path = getPhaseTodosPath(cwd, wf);
  // ... raw fs operations
}

// Future (state.ts with FileStore)
const _phaseTodosStore = (cwd: string, wf: Workflow) => 
  new JsonFileStore<PhaseTodosData>(getPhaseTodosPath(cwd, wf));

export function writePhaseTodos(cwd: string, wf: Workflow, todos: PhaseTodo[]): void {
  _phaseTodosStore(cwd, wf).write({ workflowName: wf.name, ... });
}
```

### Phase 3: Use CacheManager (Optional)

Currently, `state.ts` uses inline cache:

```typescript
// Current (state.ts)
let _phaseTodosCache: PhaseTodo[] = [];
export function setPhaseTodos(todos: PhaseTodo[]): void { _phaseTodosCache = todos; }

// Future (state.ts with CacheManager)
import { CacheManager } from './modules/cache';

const _phaseTodosCache = new CacheManager<PhaseTodo[]>(
  () => readPhaseTodosFromFile(),
  (todos) => writePhaseTodosToFile(todos)
);
```

**Note:** These are optional optimizations. The current implementation is readable and works well.

---

## Adding a Harness Adapter

Anyone can open a PR to add first-class harness support. The contract is
small enough to fit on a napkin. Adapter PRs that match this shape will
land without further architectural negotiation.

### When you need an adapter

You need an adapter (vs the universal skill-only path) when the harness
exposes things the extension can hook into:

- Native slash commands (vs file-based command generators)
- TUI overlay (status line, notification panel)
- Lifecycle hooks (session start, turn end, tool call, pre-compact)
- Structured prompts (`ask_user_question` equivalent)
- Subagent primitives that take a context flag (`context: "fresh"`) and
  acceptance contracts

If the harness only has agentskills support, the skills already work — no
adapter required.

### Files to touch

For a new harness `<h>`:

| File | Change |
|---|---|
| `extensions/stelow/types.ts` | Add `<h>` to the `CLI` union; add an entry to `getCLICapabilities` overrides |
| `extensions/stelow/state.ts` | Add `<h>` to `CLI_DETECTION_SIGNALS`; extend `detectCLI()` if needed |
| `extensions/stelow/adapters/cli-adapter.ts` | Add `case "<h>": return create<H>Adapter();` to `createAdapter()` |
| `extensions/stelow/adapters/ui-factory.ts` | Add the same `case` to `createUIAdapter()` |
| `extensions/stelow/adapters/<h>/{index,ui}.ts` | New — implements `BaseAdapter` + `UIAdapter` |
| `extensions/stelow/adapters/commands/dispatcher.ts` | Optionally extend `generateCommandFiles()` if `<h>` has a file-format command system |
| `scripts/generate-cli-commands.ts` | Optionally extend if `<h>` needs generated command files |
| `scripts/version-sync.mjs` | If `<h>` ships a plugin manifest, list it under `JSON_TARGETS` |
| `.release.yml` | Same manifest under `version_files` |
| `install.sh` | Optionally add `install_<h>()` and route through `install_for_cli()` |

The unconditional fallback is `GenericAdapter` (`extensions/stelow/adapters/generic.ts`)
which provides no-op implementations for every method. Subclassing it gets
you a working adapter shell with no behavior; override only the methods
your harness supports.

### What the orchestrator skill expects

The orchestrator reads `references/cli-tools/*.md` files. Each file has two
sections: a **Pi-native path** and a **universal fallback**. If the adapter
shadows the Pi-native methods, the orchestrator's behavior matches the
harness; otherwise it transparently falls back to universal instructions.
The adapter does not need to mirror the universal fallback — that's the
fallback path.

### Reference implementation

Tags `v0.43.4` and earlier contained reference adapter implementations for other agents.
The most complete reference (310 lines, fully populated, covering every BaseAdapter method)
is preserved at `docs/archive/2026-07-09-deprecated-multi-cli-integration/v0.43.4-multi-cli-surface.tar.gz` — extract `cli-agents/opencode/plugin/` or `extensions/stelow/adapters/opencode/index.ts` from it before writing yours.

For an in-tree starting point, look at the shipped PiAdapter at `extensions/stelow/adapters/pi/` — it covers every BaseAdapter method with concrete implementations specific to the Pi runtime.

### Why the contract is stable

The contract (BaseAdapter methods, UIAdapter methods, getCLICapabilities
shape, detector signals) was defined in v0.32 and has not changed since.
Adding a new adapter does not require touching 4 files per command
anymore: every `/sw-*` command flows from a single `WORKFLOW_COMMANDS`
list in `dispatcher.ts`. This is the simplification the v0.45.0 narrowing
bought us.

