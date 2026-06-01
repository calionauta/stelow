# cali-product-workflow Architecture

## Overview

Product planning workflow system for AI coding agents (Pi, Claude Code, OpenCode, Codex).

## System Layers

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
│  MODULES (extensions/.../modules/)                          │
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
- `PhaseTodosData` — File structure for phase-todos.json
- `InboxItem` — Simple deferred item

**Utilities:**
- `TASK_ICONS` — { pending: "○", in_progress: "◐", completed: "✓" }
- `formatTask(task)` — "✓ [SHAPE-1] Shape proposal"
- `formatTaskList(tasks, header?)` — Multi-line formatted list

## Data Flow

### Inbox Flow

```
/pw-inbox add <item>
    ↓
cmdInbox() [commands.ts]
    ↓
addToInbox(cwd, item) [state.ts]
    ↓
readInbox(cwd) → MarkdownFileStore → inbox/items.md
```

### Todo Flow

```
/pw-todo add <task>
    ↓
cmdTodo() [commands.ts]
    ↓
setPhaseTodos([...]) [state.ts - memory]
    ↓
onTurnEnd hook [index.ts]
    ↓
writePhaseTodos() [state.ts]
    ↓
JsonFileStore → {date}/{hash}/phase-todos.json
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
     '.cali-product-workflow/my-feature/items.md',
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
.cali-product-workflow/
├── inbox/                   # User's deferred items
│   └── items.md            # Markdown, one item per line
├── {date}-{hash}/          # Workflow-specific
│   ├── index.json          # { workflowName, phase, phaseIndex, updatedAt }
│   ├── phase-todos.json    # { workflowName, phase, phaseIndex, todos[], updatedAt }
│   ├── specs/              # Spec documents
│   ├── interfaces/         # Interface explorations
│   ├── plans/              # Technical plans
│   └── critiques/          # Review outputs
├── cali-product-workflow.json   # Local tracking
└── cali-pw-global.json      # Global tracking (home)
```

## Extensions

| File | Purpose |
|------|---------|
| `index.ts` | Lifecycle hooks (onTurnEnd, resume, etc.) |
| `commands.ts` | Command handlers (/pw-start, /pw-inbox, etc.) |
| `state.ts` | State management, uses modules |
| `ui.ts` | TUI components (footer, overlays) |
| `start.ts` | Workflow initialization |
| `adapters/` | CLI-specific adapters |

## Commands Reference

| Command | Description |
|---------|-------------|
| `/pw-start [idea]` | Start new workflow |
| `/pw-next` | Advance to next phase |
| `/pw-prev` | Go back to previous phase |
| `/pw-goto [phase]` | Jump to specific phase |
| `/pw-menu` | Show workflow overlay |
| `/pw-inbox` | Show inbox items |
| `/pw-inbox add <item>` | Add to inbox |
| `/pw-inbox remove <item>` | Remove from inbox |
| `/pw-todo` | Show phase todos |
| `/pw-todo add <task>` | Add todo |
| `/pw-todo complete <id>` | Mark complete |
| `/pw-stop` | Stop workflow |
| `/pw-archive` | Archive workflow |

## Phases

> **Source of truth:** `extensions/cali-product-workflow/types.ts` — the `PHASE_NAMES` array.
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
| 12 | `Execution` | Autonomous scope execution via goals + supervise |
| 13 | `Verification` | Test suite, code review, UI audit, static analysis |
| 14 | `Audit` | Execution critique (scope, quality, NFRs, docs) |

For code, use `PHASE_NAMES` from `types.ts` and the `STAGE` enum — no hardcoded indices.
For the orchestrator skill, the complete Stage Index is in `skills/cali-product-workflow/SKILL.md`.

## See Also

- `AGENTS.md` — Agent instructions
- `skills/cali-product-workflow/references/cli-tools/todo.md` — Todo system docs
- `skills/cali-product-workflow/SKILL.md` — Workflow instructions
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

