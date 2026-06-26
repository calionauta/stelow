# Todo Management

> Unified to-do pattern for cross-CLI phase task tracking. All skills MUST reference this file — never call todo tools directly.

## Quick Summary

Create, update, and track stage-specific tasks with consistent naming. Persist as a markdown checklist file — human-readable, Plannotator-friendly, LLM-native.

## Todo Naming Convention

```
[PREFIX]-[N] Task description in imperative English

Format: [PREFIX] = phase name (uppercase), [N] = sequential number starting at 1
Examples:
  [SETUP-1] Verify workflow directory structure
  [SHAPE-1] Define problem statement and solution
  [SHAPE-2] Create Appetite (time budget)
  [EXEC-3] Implement authentication feature scope
```

## Status Indicators

| Status | Checklist | Symbol | Meaning |
|--------|-----------|--------|---------|
| completed | `- [x]` | `✓` | Task finished successfully |
| in_progress | `- [ ]` (current) | `◐` | Currently being worked on |
| pending | `- [ ]` | `○` | Not yet started |

---

## Lifecycle

### Phase Checklist

1. **Create** — On phase entry, LLM writes `checklist.md` with all tasks as `- [ ]`
2. **Update** — LLM marks `- [x]` as tasks complete; user sees changes in real time via Plannotator
3. **Sync** — Every turn end, LLM writes current state to `checklist.md`
4. **Resume** — On session start, LLM reads `checklist.md` to reconstruct task state
5. **Archive** — When phase completes, `checklist.md` stays as record; new phase creates new checklist

### Inbox Items

1. **Add** — User says "defer this"; item added to end of `inbox/items.md`
2. **Read** — LLM reads inbox when user asks to review deferred items
3. **Dedupe** — If item is already in workflow, remove from inbox
4. **Execute** — When user picks item from inbox, it enters workflow

### File Sync Strategy

```
Memory Cache ←→ .stelow/{date}/{dir}/checklist.md
     ↑                  ↑
     └── onTurnEnd ─────┘
     ↑                  ↑
     └── onResume ──────┘
```

- **File** = source of truth. CLI-native todos are display only.
- **Write policy** = every turn end
- **Read policy** = session start

---

## Source of Truth

All CLIs MUST persist the checklist to file:

```
.stelow/{date}/{dir}/checklist.md
```

| CLI | Tool (for display) | Persistence | Strategy |
|-----|--------------------|-------------|----------|
| Pi + rpiv-todo | `todo` | ✅ Branch replay | Use tool for sidebar + write checklist.md for persistence |
| Claude Code | `TodoWrite` | ❌ Session only | Write checklist.md, read on resume |
| OpenCode | `TodoWrite` | ❌ Session only | Write checklist.md, read on resume |
| Codex | None | N/A | Checklist.md only |

CLI native todos are for **DISPLAY** only. `checklist.md` is always the source of truth.

**On session resume:** Read `checklist.md`, reconstruct todo list, display.

---

## Checklist Format

```markdown
# Execution: Auth System

### SCOPE-1: Auth Foundation
- [x] Create users table migration
- [x] Implement signup endpoint
- [ ] Implement login endpoint
- [ ] Add password reset flow

### SCOPE-2: Token Refresh
- [ ] Create refresh token table
- [ ] Implement refresh endpoint
- [ ] Add token rotation logic
```

**Rules:**
- `# Phase: Name` — header with phase name
- `### SCOPE-N: Name` — scope groups (must match scopes in stelow.json)
- `- [ ]` — pending / in-progress (LLM decides which)
- `- [x]` — completed
- Order = position in file. No IDs needed.
- Empty file = no active tasks

---

## CLI Commands

### pi (with rpiv-todo)

**Tool:** `todo` (via `@juicesharp/rpiv-todo` extension)

> **Required:** Install with `pi install npm:@juicesharp/rpiv-todo`

rpiv-todo persists tasks via branch replay — survives `/reload` and conversation compaction.

For cross-CLI compatibility, ALWAYS write checklist.md too:

```typescript
todo({ action: "create", subject: "[PHASE-1] Task", description: "..." })
todo({ action: "update", id: todoId, status: "completed" })
todo({ action: "list" })
// ALSO write checklist.md:
write({ path: ".stelow/{date}/{dir}/checklist.md", content: checklistContent })
```

### claude-code

**Tool:** `TodoWrite`

```typescript
TodoWrite({
  todos: [
    {
      content: "[PHASE-1] Task description",
      activeForm: "Executing [PHASE-1] Task description",
      status: "in_progress"
    }
  ]
})

// ALSO write checklist.md:
write({ path: ".stelow/{date}/{dir}/checklist.md", content: checklistContent })
```

### opencode

**Tool:** `TodoWrite` (same schema as Claude Code)

```typescript
TodoWrite({
  todos: [
    {
      content: "[PHASE-1] Task description",
      activeForm: "Executing [PHASE-1] Task description",
      status: "pending"
    }
  ]
})

// ALSO write checklist.md:
write({ path: ".stelow/{date}/{dir}/checklist.md", content: checklistContent })
```

### codex

**Tool:** No native todo tool. Write checklist.md directly:

```typescript
write({
  path: ".stelow/{date}/{dir}/checklist.md",
  content: checklistContent
})

// Read on session start to restore context
read({ path: ".stelow/{date}/{dir}/checklist.md" })
```

### generic (Fallback)

When no native todo tool is available in the current CLI:

1. Track todos as markdown in response and checklist.md
2. Persist to `.stelow/{date}/{dir}/checklist.md`
3. Read on session resume to reconstruct context
4. User sees todos in chat, not in sidebar
5. **Plannotator** (if installed): user can run `plannotator annotate .stelow/{date}/{dir}/checklist.md` for browser view

---

## Plannotator Integration

The `checklist.md` file is designed to be opened by Plannotator for real-time visual tracking:

```bash
plannotator annotate .stelow/{date}/{dir}/checklist.md
```

Plannotator renders `- [ ]` / `- [x]` as interactive checkboxes in the browser. When the LLM updates the file, refreshing the Plannotator tab shows current progress.

**Auto-open during Execution:** The LLM runs this command automatically when the checklist is first created (see `stages/execution.md`).

---

## Implementation Notes

1. **Every response**: Start with phase indicator, show todo list
2. **Before writing checklist.md**: Read current workflow state from tracking file
3. **After phase completion**: Archive checklist.md (it stays as record); new phase creates new checklist
4. **On session resume**: Read `checklist.md` to reconstruct task state
5. **Never mix phases**: Each checklist belongs to one phase only. Archive before creating next.
6. **File is truth**: CLI-native todos may be lost on session end — `checklist.md` persists
7. **Plannotator is optional**: If not installed, user can view checklist.md directly
