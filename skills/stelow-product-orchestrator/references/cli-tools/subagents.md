# Subagents

## ⛔ CRITICAL RULE — READ FIRST

> **EVERY stelow subagent call uses FRESH context.**
>
> - **Nicobailon (legacy):** pass `context: "fresh"` explicitly — packaged `worker`/`planner`/`oracle` default to `fork` (context rot ~73% → ~33% rule adherence over 16 turns).
> - **Tintinweb:** `inherit_context` defaults to `false` (fresh). No extra param needed. Pass `inherit_context: true` ONLY for fork (rare in stelow).
> - **Pi built-in:** Always isolated context. No `context` param exists.
> - **Enforcement:** every example in this file uses fresh context. Every skill's subagent invocation in `skills/*/` uses fresh context. Do not deviate.
>
> **TL;DR:** Fresh is non-negotiable. Fork is fallback only.

## Quick Summary

> Delegate parallel work to built-in subagents with task handoff. Alternative: execute directly with context preservation.

## Available Invocations

| Surface | Invocation | Context behavior |
|---------|------------|-----------------|
| **Pi + tintinweb** (current) | `Agent({ subagent_type, prompt, description, ... })` via `@tintinweb/pi-subagents` | `inherit_context: false` (default) = fresh. No extra param needed. |
| **Pi + nicobailon** (legacy) | `subagent({ agent, task, context: "fresh", reads, acceptance })` via `npm:pi-subagents` | Explicit `context: "fresh"` overrides packaged-agent `fork` defaults |
| **Pi built-in** (fallback) | `subagent({ agent, task })` | Always isolated — separate `pi` process; no `context` param |
| **Universal fallback** (any agent) | Execute directly; file-based handoff (`write` → next stage `read`) | Fresh-context by construction |

## Command Details

### pi + tintinweb/pi-subagents (current)

Tool: `Agent`, `get_subagent_result`, `steer_subagent`

```typescript
Agent({
  subagent_type: "[type]",
  prompt: "Full task description with context and instructions",
  description: "Short 3-5 word label",
  // Optional:
  model: "provider/model",       // model override
  thinking: "low",               // thinking level
  run_in_background: true,       // parallel: multiple Agent() calls in one message
  max_turns: 30,                 // cap turns
  isolated: true,                // no extension/MCP tools
  inherit_context: false,        // DEFAULT — fresh. Omit unless fork needed (rare)
})
```

| Package | Source |
|---------|--------|
| `@tintinweb/pi-subagents` | tintinweb |

**Context:** `inherit_context: false` is the default. No extra param needed for fresh context. Pass `inherit_context: true` ONLY when child needs parent's filtered session history (extremely rare in stelow).

**Parallel:** Send multiple `Agent()` calls with `run_in_background: true` in a single LLM message. You will be notified on completion — never poll or sleep.

**Get results:** `get_subagent_result({ agent_id, wait: true })` blocks until the agent finishes and returns its output.

**Steer mid-run:** `steer_subagent({ agent_id, message })` sends a redirect message to a running background agent.

**Built-in agent types:**

| Type | Tools | Use for |
|------|-------|---------|
| `general-purpose` | All 7 | Parent twin — inherits parent's system prompt. Use for implementation, code review, delegated work. |
| `Explore` | read, bash, grep, find, ls | Fast codebase recon (read-only). Good replacement for nicobailon's `scout`. |
| `Plan` | read, bash, grep, find, ls | Architecture/planning (read-only). |

Custom agents in `.pi/agents/<name>.md` (project) or `~/.pi/agent/agents/<name>.md` (global) are auto-discovered.

### pi + nicobailon/pi-subagents (legacy)

Tool: `subagent()`

```typescript
subagent({
  agent: "[type]",
  task: "...",
  output: "...",
  context: "fresh"  // MUST pass explicitly — packaged agents default to fork
})
```

| Package | Source |
|---------|--------|
| pi-subagents | nicobailon |

**Packaged-agent gotcha:** `worker`, `planner`, `oracle` ship with `defaultContext: "fork"`. **Always override with `context: "fresh"`**:

| Agent | Default | Stelow use |
|-------|---------|------------|
| `oracle` | `fork` | NOT used by stelow |
| `planner` | `fork` | NOT used by stelow |
| `worker` | `fork` | Scope executor; **must override with `context: "fresh"`** |
| `scout`, `reviewer`, `researcher`, `delegate`, `context-builder` | `fresh` | No override needed |

**Agent types (nicobailon):**

| Type | Stelow use |
|------|------------|
| `scout` | Codebase recon |
| `researcher` | Web/docs research |
| `context-builder` | Context gathering before planning |
| `delegate` | Proposals, consolidation, skill-based delegation |
| `reviewer` | Code review |
| `worker` | Scope execution (from spec-tech.md) |

### pi built-in (fallback)

When no pi-subagents extension is installed:

```typescript
subagent({ agent: "[type]", task: "..." })
```

Always isolated context. No `reads` param — embed file paths in the task string.

### generic (Fallback)

When subagent is not available:

1. Execute task directly in current context
2. Save outputs to files
3. Read files in next task for continuation

```typescript
write({ path: "output.md", content: "..." })
read({ path: "output.md" })
```

---

## Deterministic CLI dispatch

Read `detected_cli` from `.stelow/{date}/{dir}/index.json`. Emit the literal call shape for that CLI:

| `detected_cli` | **Required** invocation |
|---|---|
| `pi` (tintinweb) | `Agent({ subagent_type, prompt, description })` — omit `inherit_context` (defaults to fresh). Use `run_in_background: true` for parallelism. |
| `pi` (nicobailon) | `subagent({ agent, task, reads, context: "fresh", acceptance? })` — `context: "fresh"` is mandatory. |
| `pi` (built-in, no extension) | `subagent({ agent, task })` — embed file paths in task string. |
| `generic` | Execute directly; save output to file; next stage reads it. |

### PARALLEL dispatch

| `detected_cli` | **PARALLEL** invocation |
|---|---|
| `pi` (tintinweb) | Multiple `Agent({...description, run_in_background: true})` calls in same message. True concurrency via background queue. |
| `pi` (nicobailon) | `subagent({ tasks: [...], concurrency: N, context: "fresh" })` |
| `pi` (built-in) | Multiple `subagent(...)` calls — queues serially (no true concurrency) |
| `generic` | `cmd_a & cmd_b & wait` (POSIX) |

**Selection rule:** Read `detected_cli` from `index.json`, pick the row, emit verbatim.

---

## Fallback — pi without subagents extension

| Feature | pi built-in | pi + subagents |
|---------|-------------|----------------|
| Invocation | `subagent({ agent, task })` | `Agent(...)` or `subagent({...})` with full params |
| `reads` | Embed in task string | ✅ Explicit param |
| `acceptance` | Parent-controlled loop | ✅ Native self-correction |
| Parallel fan-out | Sequential calls | ✅ Background concurrency |

### How to detect which is installed

```bash
# Check which subagents extension is installed
npm ls @tintinweb/pi-subagents 2>/dev/null && echo "TINTINWEB" && exit 0
npm ls pi-subagents 2>/dev/null | grep -q pi-subagents && echo "NICOBAILON" && exit 0
echo "BUILTIN_ONLY"
```

The orchestrator reads `detected_cli` from `index.json` and picks the correct row.

---

## Error Recovery

Subagent failures can happen (API timeout, transient errors, rate limits).
Use this pattern for graceful degradation:

### Retry Pattern

```
For each subagent call:
  1. Launch subagent with timeout
  2. If success → continue
  3. If fail (timeout, API error, crash):
     a. Log error to execution-report.json
     b. Retry ONCE with same inputs + timeout
     c. If success on retry → continue (flag as recovered)
     d. If fail again:
        - Mark scope/task as SKIPPED
        - Log reason to execution-report.json
        - Continue to next task (do NOT block)
```

### Key rules

1. **Do NOT block** other parallel subagents on one failure
2. **Retry ONCE** — a second retry is overengineering for planning tasks
3. **Always log** — silent failures are worse than skipped tasks
4. **Graceful degradation** — a skipped subagent is better than a deadlocked workflow

---

## Headless CLI fallback (any agent)

When no native subagent tool is available, spawn pi as a headless subprocess:

```bash
pi --print "generate report and save to output.md"
pi --print "You are a code reviewer. Review this diff for correctness." > review.md
```

### Parallel headless

```bash
pi --print "task A" > output-a.md &
pi --print "task B" > output-b.md &
wait
```

---

## Universal Fallback (any CLI/agent)

When `detected_cli` is `generic` or unknown:

```yaml
Steps:
  1. Execute the task directly in the current session
  2. Save the output to a file
  3. The next stage reads the file for continuation
```

---

## Degradation Ladder

```
1. Check detected_cli from index.json
   │
   ├── pi detected?
   │   ├── tintinweb?   →  ✅ Agent({ subagent_type, prompt, description })
   │   ├── nicobailon?  →  ✅ subagent({ agent, task, reads, context:"fresh", acceptance? })
   │   └── built-in?    →  ⚠️ subagent({ agent, task }) — embed paths in task
   │
   ├── any other agent? →  ⚠️ Headless CLI or Universal Fallback
   ├── generic/unknown? →  ❌ Universal Fallback (write + read)
   └── subagent failed? →  ❌ retry once → Headless CLI → Universal Fallback
```

**Summary by quality:**
1. ✅ **pi + tintinweb** — `Agent()` tool, true parallelism via background, fresh by default
2. ✅ **pi + nicobailon** — agent types, `reads`, `acceptance`, native parallelism
3. ⚠️ **pi built-in** — same agent types, always isolated, no extra params
4. ⚠️ **Headless CLI** — no agent types, parallel via `&` + `wait`
5. ❌ **Universal Fallback** — synchronous, same session. Works on EVERY agent
