# Todo Management

> Unified to-do pattern for cross-CLI phase task tracking. All skills MUST reference this file — never call todo tools directly.

## Quick Summary

Create, update, and track stage-specific tasks with consistent naming. Persist as a markdown checklist file — human-readable, visual review-friendly, LLM-native.

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
2. **Update** — LLM marks `- [x]` as tasks complete; user sees changes in real time via visual review
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

- **File** = source of truth. Harness-native todos are display only.
- **Write policy** = every turn end
- **Read policy** = session start

---

## Source of Truth

All CLIs MUST persist the checklist to file:

```
.stelow/{date}/{dir}/checklist.md
```

| Harness capability | Tool (for display) | Persistence | Strategy |
|-----|--------------------|-------------|----------|
| Native todo/task tools | The harness's own task tools | ✅ Where the harness persists | Use tool for display + always write checklist.md for persistence |
| Any other agent | n/a | ❌ Session only | Write checklist.md, read on resume |

CLI native todos are for **DISPLAY** only. `checklist.md` is always the source of truth.

**On session resume:** Read `checklist.md`, reconstruct todo list, display.

---

## CLI Commands

### Harness with native task tools

If the harness exposes task tools (create/list/update or equivalent):

```typescript
// Shape varies by harness — adapt to the registered tool:
TaskCreate({ subject: "[PHASE-1] Task", description: "..." })
TaskUpdate({ taskId: "1", status: "completed" })
TaskList()
// Returns all tasks with status, owner, blocked-by info
```

Tasks are created in `pending` status, updated to `in_progress` when started, `completed` when done. For cross-harness compatibility, ALWAYS write checklist.md too:

```typescript
TaskCreate({ subject: "[PHASE-1] Task", description: "..." })
TaskUpdate({ taskId: "1", status: "completed" })
TaskList()
// ALSO write checklist.md:
write({ path: ".stelow/{date}/{dir}/checklist.md", content: checklistContent })
```

### Generic (fallback)

When no native todo tool is available:

1. Track todos as markdown in response and checklist.md
2. Persist to `.stelow/{date}/{dir}/checklist.md`
3. Read on session resume to reconstruct context
4. User sees todos in chat, not in sidebar
5. **visual review** (if installed): `visual_review annotate .stelow/{date}/{dir}/checklist.md`

---

## visual review Integration

The `checklist.md` file is designed to be opened by visual review for real-time visual tracking:

```bash
visual_review annotate .stelow/{date}/{dir}/checklist.md
```

visual review renders `- [ ]` / `- [x]` as interactive checkboxes in the browser. When the LLM updates the file, refreshing the visual review tab shows current progress.

**Auto-open during Execution:** The LLM runs this command automatically when the checklist is first created (see `stages/execution.md`).

---

## Implementation Notes

1. **Every response**: Start with phase indicator, show todo list
2. **Before writing checklist.md**: Read current workflow state from tracking file
3. **After phase completion**: Archive checklist.md (it stays as record); new phase creates new checklist
4. **On session resume**: Read `checklist.md` to reconstruct task state
5. **Never mix phases**: Each checklist belongs to one phase only. Archive before creating next.
6. **File is truth**: CLI-native todos may be lost on session end — `checklist.md` persists
7. **visual review is optional**: If not installed, user can view checklist.md directly
