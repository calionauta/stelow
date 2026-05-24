# Todo Management

> Unified to-do pattern for cross-CLI phase task tracking. All skills MUST reference this file — never call todo tools directly.

## Quick Summary

Create, update, and track phase-specific tasks with consistent naming. Phase prefix ensures user always knows which stage they're in.

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

| Status | Symbol | Meaning |
|--------|--------|---------|
| completed | `✓` | Task finished successfully |
| in_progress | `◐` | Currently being worked on |
| pending | `○` | Not yet started |

---

## Source of Truth

All CLIs MUST write phase todos to file for cross-CLI persistence:

```
.cali-product-workflow/{date}/{dir}/phase-todos.json
```

| CLI | Tool | Persistence | Strategy |
|-----|------|-------------|----------|
| Pi + rpiv-todo | `todo` | ✅ Branch replay | Use tool + write to file |
| Claude Code | `TodoWrite` | ❌ Session only | Write to file, read on resume |
| OpenCode | `TodoWrite` | ❌ Session only | Write to file, read on resume |
| Codex | None | N/A | File-based only |

CLI native todos are for **DISPLAY**. File is always the source of truth.

**On session resume:** Read phase-todos.json, reconstruct todo list, display.

---

## CLI Commands

### pi (with rpiv-todo)

**Tool:** `todo` (via `@juicesharp/rpiv-todo` extension)

> **Required:** Install with `pi install npm:@juicesharp/rpiv-todo`

rpiv-todo persists tasks via branch replay — survives `/reload` and conversation compaction.

For cross-CLI compatibility, ALWAYS write phase todos to file (see "Source of Truth" section).


```typescript
todo({ action: "create", subject: "[PHASE-1] Task", description: "..." })
todo({ action: "update", id: todoId, status: "completed" })
todo({ action: "list" })
```

### claude-code

**Tool:** `TodoWrite`

```typescript
TodoWrite({
  todos: [
    {
      content: "[PHASE-1] Task description",
      activeForm: "Executing [PHASE-1] Task description",
      status: "in_progress"  // pending | in_progress | completed
    }
  ]
})

// Replace entire list on each update
TodoWrite({ todos: updatedArray })
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
```

### codex

**Tool:** No native todo tool. Use file-based tracking:

```typescript
// Write todo state to file
write({
  path: ".cali-product-workflow/{date}/{dir}/phase-todos.json",
  content: JSON.stringify({
    phase: "SHAPE",
    phaseIndex: 3,
    todos: [
      { id: "SHAPE-1", content: "...", status: "completed" },
      { id: "SHAPE-2", content: "...", status: "in_progress" }
    ]
  }, null, 2)
})

// Read on session start to restore context
read({ path: ".cali-product-workflow/{date}/{dir}/phase-todos.json" })
```

### generic (Fallback)

When no native todo tool is available, track tasks in the response:

```
## Current Phase Tasks: SHAPE (Phase 4/13)

✓ [SHAPE-1] Define problem statement
◐ [SHAPE-2] Create Appetite (time budget)
○ [SHAPE-3] Define IN scope boundaries
○ [SHAPE-4] Define OUT scope boundaries
---

## Inbox Format

The inbox (`.cali-product-workflow/inbox/items.md`) stores items deferred by the user.


```markdown
[feature] Implement dark mode — lower priority, 2026-05-21
[bug] Fix login race condition — needs investigation, 2026-05-20
[debt] Refactor auth module — tech debt, 2026-05-15
[idea] Add AI summarization — exploratory, 2026-05-10
```

**Format:** `[type] title — metadata, YYYY-MM-DD`
- **type**: feature, bug, debt, idea
- Metadata: comma-separated, human-readable notes
- Date: ISO format (YYYY-MM-DD)

---
○ [SHAPE-5] Write solution approach
```

---

## Phase Task Templates

### Phase 0: Triage

```
✓ [TRIAGE-1] Extract items from user input
○ [TRIAGE-2] Categorize each item (feature|bug|debt|idea)
○ [TRIAGE-3] Present items for user confirmation
○ [TRIAGE-4] Process user decisions (accept/defer/reject)
```

### Phase 1: Selection

```
○ [SELECT-1] Present ranked items to user
○ [SELECT-2] User selects items to proceed with
```

### Phase 2: Setup

```
○ [SETUP-1] Check for deferred items from previous sessions
○ [SETUP-2] Verify .cali-product-workflow directory exists
○ [SETUP-3] Scan for existing in-progress workflows
○ [SETUP-4] Execute safe-change if selected
○ [SETUP-5] Present workflow stage options to user
```

### Phase 3: Context

```
○ [CONTEXT-1] Ask user about strategic analysis approaches
○ [CONTEXT-2] Execute selected strategic analyses (parallel)
○ [CONTEXT-3] Consolidate strategic insights
○ [CONTEXT-4] Detect domain libraries from user input
○ [CONTEXT-5] Offer domain playbook loading if applicable
```

### Phase 4: Shape

```
○ [SHAPE-1] Define problem statement
○ [SHAPE-2] Create Appetite (time budget)
○ [SHAPE-3] Define IN scope (what's included)
○ [SHAPE-4] Define OUT scope (what's excluded)
○ [SHAPE-5] Write solution approach
○ [SHAPE-6] Identify rabbit holes (risks to avoid)
```

### Phase 5: Critique

```
○ [CRITIQUE-1] Run claim verification on spec references
○ [CRITIQUE-2] Review completeness (all 6 fields present)
○ [CRITIQUE-3] Review feasibility (appetite vs scope)
○ [CRITIQUE-4] Review risks and dependencies
○ [CRITIQUE-5] Generate critique report
```

### Phase 6: Gate

```
○ [GATE-1] Submit to Plannotator for visual review
○ [GATE-2] Address reviewer feedback if requested
○ [GATE-3] Mark spec as frozen after approval
```

### Phase 7: Scope Adjustment

```
○ [SCOPE-1] Review current IN/OUT boundaries
○ [SCOPE-2] Ask user about adding items to IN
○ [SCOPE-3] Ask user about removing items from IN
○ [SCOPE-4] Update spec if changes made
```

### Phase 8: Interface (if selected)

```
○ [INTERFACE-1] Generate 5 interface proposals (parallel)
○ [INTERFACE-2] Create ASCII mockups for each proposal
○ [INTERFACE-3] Present proposals to user
○ [INTERFACE-4] Generate hybrid combining best elements
○ [INTERFACE-5] Select 2-3 finalists for Gate review
```

### Phase 9: Interface Gate

```
○ [INTGATE-1] Submit finalists to Plannotator
○ [INTGATE-2] Address feedback if requested
○ [INTGATE-3] Note approved interfaces
```

### Phase 10: Interface Selection

```
○ [INTSELECT-1] Present final options with previews
○ [INTSELECT-2] User selects preferred interface(s)
```

### Phase 11: Tech Planning

```
○ [TECH-1] Generate typed scopes (feature|optimization|spike|test-*)
○ [TECH-2] Define scope dependencies (topological order)
○ [TECH-3] Calculate sequencing (parallel where possible)
○ [TECH-4] Write spec-tech.md with scopes
○ [TECH-5] Add test-* scopes if software product
○ [TECH-6] Submit to Plannotator for tech review
```

### Phase 12: Execution

```
Per scope (repeat for each scope):
○ [EXEC-N] Execute [scope-name] scope
○ [EXEC-N] Verify scope completion per DoD
○ [EXEC-N] Run codequality-review if complexity threshold met

Overall:
○ [EXEC-ALL] All scopes completed
○ [EXEC-AUDIT] Proceed to Delivery Audit
```

### Phase 13: Audit

```
○ [AUDIT-1] Verify all planned scopes implemented
○ [AUDIT-2] Identify scope gaps (missing or extra)
○ [AUDIT-3] Run quality gates (tests, lint, build)
○ [AUDIT-4] Document lessons learned
○ [AUDIT-5] Generate delivery-audit.md
○ [AUDIT-6] Archive workflow
```

---

## Response Format Template

At the START of each phase, output:

```
🔍 **[Phase Name]** (N/13) — "[Workflow Name]"

📋 Tasks:
✓ [PREFIX-1] Completed task description
◐ [PREFIX-2] Currently active task description
○ [PREFIX-3] Pending task description
○ [PREFIX-4] Pending task description

➡️ Next: [What happens after completing current tasks]
```

---

## Implementation Notes

1. **Every response**: Start with phase indicator, show todo list
2. **Before calling todo tool**: Read current workflow state from tracking file
3. **After phase completion**: Call `/pw-next` to advance and create new todo set
4. **On session resume**: Reconstruct todo list from current phase tracking data
5. **Never mix phases**: Each todo set belongs to one phase only
6. **File persistence**: Always write todos to `phase-todos.json` (see Source of Truth)
7. **CLI todos are display only**: They may be lost on session end — file is always truth

---

## Phase-Todos.json Format

```json
{
  "workflow": "workflow-name",
  "phase": "SHAPE",
  "phaseIndex": 3,
  "todos": [
    { "id": "SHAPE-1", "content": "Define problem statement", "status": "completed" },
    { "id": "SHAPE-2", "content": "Create Appetite", "status": "in_progress" },
    { "id": "SHAPE-3", "content": "Define IN scope", "status": "pending" }
  ],
  "updatedAt": "2026-05-24T10:00:00Z"
}
```

---

## Fallback (Generic)

When no native todo tool is available in the current CLI:

1. Track todos as markdown in response
2. Persist to `.cali-product-workflow/{date}/{dir}/phase-todos.json`
3. Read on session resume to reconstruct context
4. User sees todos in chat, not in sidebar