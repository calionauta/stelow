# Data Model

Entities, relationships, and data flow for cali-product-workflow.

## Workflow Directory Structure

All workflow files are stored under `.cali-product-workflow/` using a date-hash scheme for isolation and auto-discovery.

```
.cali-product-workflow/
├── inbox/
│   └── items.md                    # Deferred items (one per line, Markdown)
├── {YYYY-MM-DD}/{_dir}/            # Workflow-specific
│   ├── index.json                  # { workflowName, phase, phaseIndex, updatedAt }
│   ├── phase-todos.json            # { workflowName, phase, phaseIndex, todos[], updatedAt }
│   ├── specs/
│   │   └── spec-product_v{N}.md   # Shape Up output
│   ├── interfaces/
│   │   └── interfaces_v{N}.md     # Interface proposals
│   ├── plans/
│   │   ├── spec-tech_v{N}.md      # Technical plan
│   │   └── scopes/                # Individual scope definitions
│   ├── critiques/
│   │   └── critique-report_v{N}.md # Review outputs
│   ├── approvals/
│   │   └── *.receipt.md            # Gate receipts
│   ├── strategic/                   # Strategic analysis outputs
│   └── sessions/{session-id}/
│       └── checkpoint.json         # Resume checkpoints
└── ~/.cali-pw-global.json         # Global tracking (home dir)

> **Nota:** O arquivo `cali-product-workflow.json` (tracking local por projeto) 
> está planejado mas não implementado — atualmente só existe o global em 
> `~/.cali-pw-global.json`. Não existe `tracking.json` separado; o estado 
> atual da workflow é mantido em `index.json`.
```

### Key Rules

Stable invariants for directory and file naming. `{_dir}` is persistent; version numbers increment.

- `{_dir}` is the stable directory name (never changes on rename)
- `{name}` is the display name (may change via rename)
- Version numbers increment: `spec-product_v1.md`, `spec-product_v2.md`, etc.
- Session knowledge files live in `.cali-product-workflow/session-knowledge/`

## File Store Types

Typed persistence classes for reading and writing files. Directory creation is handled automatically.

### TextFileStore

Stores/reads plain text files. Uses `\n\n---\n\n` as separator for multi-item files like inbox items.

### JsonFileStore<T>

Generic typed JSON persistence. `store.read()` returns `T | null`. `store.write(data)` creates directories automatically.

### MarkdownFileStore

Reads/writes Markdown line arrays, skipping `# ` heading lines. Used for structured markdown lists.

## Cache Types

In-memory caches with optional file persistence for state that must survive restarts.

### CacheManager<T>

Single-value cache with optional file persistence callbacks:
- `cache.get()` — returns from memory or loads from file
- `cache.set(data)` — writes to memory and optionally persists to file
- On cache miss, loads via the read callback

### MapCache<K, V>

Generic key-value cache with `get(key)`, `set(key, value)`, `has(key)`, `delete(key)` operations.

## Task Types

Shared type definitions for todos used across the workflow system.

### PhaseTodo

A task item within a workflow phase with a unique ID and status.

```typescript
{
  id: string;          // e.g., "SHAPE-1"
  description: string; // Task description
  status: TaskStatus;  // "pending" | "in_progress" | "completed"
}
```

### InboxItem

Simple string items deferred during a workflow session. Stored in `inbox/items.md`.

### TaskStatus

Enum for the three possible states of a task item.

```typescript
type TaskStatus = "pending" | "in_progress" | "completed";
```

## Global vs Local Tracking

Three tracking levels exist — global (all projects), local (current project), and per-workflow.

- **Global** (`cali-pw-global.json`) — tracks all workflows across projects. Stored in the user's home directory.
- **Local** (`cali-product-workflow.json`) — tracks workflows for the current project only. Stored in `.cali-product-workflow/`.
- **Per-workflow** (`{date}/{_dir}/tracking.json`) — tracks the current state of a single workflow session.

## Data Flow Patterns

Common data flow sequences that illustrate how state moves through the system.

### Inbox Flow

Flow for deferring an item to the inbox during a workflow session.

```
/pw-inbox add <item>
    → cmdInbox() in commands.ts
    → addToInbox() in state.ts
    → MarkdownFileStore → inbox/items.md
```

### Todo Flow

Flow for adding a task to the current phase's todo list.

```
/pw-todo add <task>
    → cmdTodo() in commands.ts
    → setPhaseTodos([...]) in state.ts (memory)
    → onTurnEnd hook in index.ts
    → writePhaseTodos() in state.ts
    → JsonFileStore → {date}/{hash}/phase-todos.json
```

### Resume Flow

Flow for restoring todos from disk when resuming a workflow session.

```
Session Start
    → onTurnEnd hook in index.ts
    → readPhaseTodos() via JsonFileStore
    → setPhaseTodos() in state.ts (memory cache)
    → LLM sees restored todos
```

> **Nota:** O flow de resume é gerenciado pelo `onTurnEnd` hook em 
> `extensions/cali-product-workflow/index.ts`; não há uma função 
> `detectActiveWorkflow()` separada no index.ts atualmente.

### Workflow Scan (Auto-Discovery)

```
Any time
    → scanWorkflowDirs()
    → Reads all {date}/{_dir}/index.json files
    → Filters by active/archived status
    → Returns sorted list for navigation commands
```

See `// @lat: [[data-model#Workflow Scan (Auto-Discovery)]]` in `extensions/cali-product-workflow/state.ts:scanWorkflowDirs`.
