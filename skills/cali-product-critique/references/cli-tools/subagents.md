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

> **Note:** Examples below express `context` intent for clarity. Only pi supports the `context` parameter; other CLIs ignore it (subagents are always independent). The intent still matters for documentation and future-proofing — see the [fork vs fresh section](#conceptual-intent-fork-vs-fresh).

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

## Conceptual Intent: `fork` vs `fresh`

This is the **mental model** — what the LLM should *desire* and *document*, regardless of whether the current CLI has a knob for it.

| Intent | What it means conceptually | When to express this intent |
|--------|---------------------------|-----------------------------|
| `fork` | Child inherits parent context — sees what the parent has been working on, decisions made, files read | Advisory threads (`oracle`); execution tasks where parent history provides useful signal; parallel proposals that should be consistent with the session's direction |
| `fresh` | Clean slate — child sees only what you explicitly hand it. No biased history, no degraded context, no inherited assumptions | **Adversarial code review** (strongly recommended); any task where independence matters more than coherence with the parent session |

**Key insight:** `fork` means the reviewer gets the parent's potentially contaminated context (context rot ~73% → ~33% rule adherence over 16 turns, Gamage 2026). `fresh` means the reviewer sees the code with full rule awareness, untainted by the executor's degraded context. This is why **adversarial review should always express `fresh` intent**.

### Current implementation per CLI

| CLI | Supports this config? | What happens |
|-----|----------------------|--------------|
| **pi** (pi-subagents) | ✅ `context: "fork"` or `context: "fresh"` | Exact mapping — default `fork`, pass `fresh` explicitly |
| **OpenCode** | ❌ No `context` parameter | Subagents always run in their own context — equivalent to `fresh` in practice |
| **Claude Code** | ❌ No `context` parameter | "Each subagent runs in its own context window" — always `fresh` |
| **Codex** | ❌ No `context` parameter | Independent threads via `/agent` — always `fresh` |

**Rule of thumb for skill authors:** Always express the *intent* (`fork` vs `fresh`) in the skill instructions. The LLM will translate it to the best available mechanism for the active CLI. If the CLI doesn't support the parameter, the intent still matters: for `fresh`, ensure the subagent task includes everything it needs in isolation; for `fork`, consider whether passing context files manually achieves the goal.

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