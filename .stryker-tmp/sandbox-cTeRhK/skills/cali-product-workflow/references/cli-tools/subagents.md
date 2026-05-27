# Subagents

## Quick Summary

> Delegate parallel work to built-in subagents with task handoff. Alternative: execute directly with context preservation.

## Available Commands by CLI

| CLI | Command | Package | Available |
|-----|---------|---------|-----------|
| pi | `subagent({ agent, task, context })` | pi-subagents | ✅ |
| opencode | `subagent({ agent, task, context })` | Built-in | ✅ |
| claude-code | `subagent({ agent, task, context })` | Built-in | ✅ |
| codex | `subagent({ agent, task, context })` | Built-in | ✅ |
| generic | Execute directly with file-based handoff | — | ✅ |

## Command Details

### pi

```typescript
subagent({
  agent: "[type]",
  task: "...",
  output: "...",
  context: "fork"
})
```

| Package | Source |
|---------|--------|
| pi-subagents | nicobailon |

### opencode, claude-code, codex

```typescript
subagent({
  agent: "[type]",
  task: "...",
  output: "...",
  context: "fork"
})
```

Built-in delegate/subagent functionality.

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

### Parallel with Review

```typescript
subagent({
  tasks: [
    { agent: "reviewer", task: "Review diff for correctness", output: false },
    { agent: "reviewer", task: "Review diff for simplicity", output: false }
  ],
  concurrency: 2,
  context: "fork"
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

## Context Mode

| Mode | When to use |
|------|-------------|
| `fork` | Independent task, fresh context |
| `fresh` | Start new without parent context |

**Default:** `fork` for parallel tasks.

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