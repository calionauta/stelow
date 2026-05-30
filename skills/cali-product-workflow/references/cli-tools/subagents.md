# Subagents

## Quick Summary

> Delegate parallel work to built-in subagents with task handoff. Alternative: execute directly with context preservation.

## Available Commands by CLI

| CLI | Command | Package | Available | Context behavior |
|-----|---------|---------|-----------|-----------------|
| pi | `subagent({ agent, task, context })` | pi-subagents | ✅ | Default `fork` (inherits filtered history); pass `context: "fresh"` for independent review |
| opencode | `subagent({ agent, task })` | Built-in | ✅ | Always runs in its own context — no `fork`/`fresh` distinction |
| claude-code | `subagent({ agent, task })` | Built-in | ✅ | Always runs in its own context window — no `fork`/`fresh` distinction |
| codex | `subagent({ agent, task })` | Built-in | ✅ | Always runs in its own thread — no `fork`/`fresh` distinction |
| generic | Execute directly with file-based handoff | — | ✅ | — |

## Command Details

### pi

```typescript
subagent({
  agent: "[type]",
  task: "...",
  output: "...",
  context: "fork"  // or "fresh" for independent review
})
```

| Package | Source |
|---------|--------|
| pi-subagents | nicobailon |

**Default:** `fork` (inherits filtered session history). Pass `context: "fresh"` for adversarial review (zero parent history).

### opencode, claude-code, codex

```typescript
subagent({
  agent: "[type]",
  task: "...",
  output: "..."
  // No context parameter — subagents always run in their own context
})
```

Built-in delegate/subagent functionality. **Subagents always run in their own independent session** — they do not inherit parent session context, so there is no `fork`/`fresh` distinction to configure.

### generic (Fallback)

When subagent is not available:

1. Execute task directly in current context
2. Save outputs to files
3. Read files in next task for continuation

```typescript
// Instead of subagent, execute directly:
// 1. Do the work
// 2. Save to file
write({ path: "output.md", content: "..." })
// 3. Next task reads the file
read({ path: "output.md" })
```

---

## Agent Types

| Type | Purpose | Example |
|------|---------|---------|
| `worker` | Parallel task execution | Generate proposals A-E |
| `reviewer` | Adversarial code review | Review diff, check regressions |
| `scout` | Codebase investigation | Find relevant files, patterns |
| `researcher` | External research | Investigate external docs |
| `delegate` | Skill-based delegation | Execute skill with context |
| `planner` | Strategic planning | Generate tech scopes from spec |

---

## Common Patterns

> **Note:** `context` parameter is **pi-only**. OpenCode/Claude Code/Codex examples omit it — their subagents are always independent.

### Parallel (Step 1 - 5 proposals)

```typescript
subagent({
  tasks: [
    { agent: "worker", task: "Generate Proposal A for [context]. Full format." },
    { agent: "worker", task: "Generate Proposal B for [context]. Full format." },
    { agent: "worker", task: "Generate Proposal C for [context]. Full format." },
    { agent: "worker", task: "Generate Proposal D for [context]. Full format." },
    { agent: "worker", task: "Generate Proposal E for [context]. Full format." }
  ],
  concurrency: 5,
  context: "fork"
})
```

### Single (Step 3 - Hybrid)

```typescript
subagent({
  agent: "worker",
  task: "Read proposals A-E from interfaces_v{N}.md. Generate Hybrid combining best elements.",
  reads: [".cali-product-workflow/.../interfaces/interfaces_v{N}.md"]
})
```

### Parallel with Review (adversarial)

```typescript
subagent({
  tasks: [
    { agent: "reviewer", task: "Review diff for correctness", output: false },
    { agent: "reviewer", task: "Review diff for simplicity", output: false }
  ],
  concurrency: 2,
  context: "fresh"  // pi only; other CLIs are always fresh
})
```

### Scouting

```typescript
subagent({
  agent: "scout",
  task: "Investigate codebase for: [objective]. Find relevant files, patterns, constraints.",
  output: "context-findings.md"
})
```

---

## Context Mode (pi only — `fork` vs `fresh`)

> **Important:** The `fork` vs `fresh` distinction **only exists on pi** (via pi-subagents extension). OpenCode, Claude Code, and Codex subagents always run in their own independent context — there is no `context` parameter and no distinction to configure.

| Mode | Behavior | When to use |
|------|----------|-------------|
| `fork` | Branches from the parent session — child inherits filtered history | Advisory threads (`oracle`); tasks that benefit from parent context |
| `fresh` | Truly new session — zero parent history, clean context | **Adversarial code review** (recommended); any task where parent contamination would bias results |

**Key insight (pi only):** `fork` copies the parent's potentially degraded session (context rot ~73% → ~33% over 16 turns, Gamage 2026). `fresh` gives the reviewer full rule awareness, untainted by the executor's degraded context.

**Default (pi):** `planner`, `worker`, `oracle` default to `fork`. For code review, always use `context: "fresh"`.

**Other CLIs:** No action needed — subagents are already independent by default.

**Fallback:** If the CLI lacks subagent support entirely, execute directly and hand off via files.

---

## Output Files

For tasks that save output, use meaningful paths:

```
.cali-product-workflow/{YYYY-MM-DD}/{_dir}/interfaces/interfaces_v{N}.md
.cali-product-workflow/.../strategic/{name}.md
```

---

## Fallback (Generic)

> Delegate parallel work to built-in subagents with task handoff pattern. Use the agent's native subagent/delegate tool.

If no subagent available:
- Execute tasks directly
- Save outputs to files
- Read files for continuation