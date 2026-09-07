# Subagents

## ⛔ CRITICAL RULE — READ FIRST

> **EVERY stelow subagent call uses FRESH context.**
>
> - **Tools whose packaged agents default to fork:** pass fresh explicitly
>   (context rot ~73% → ~33% rule adherence over 16 turns).
> - **Tools that default to fresh/isolated:** no extra param needed.
> - **Enforcement:** every example in this file uses fresh context. Every skill's subagent invocation in `skills/*/` uses fresh context. Do not deviate.
>
> **TL;DR:** Fresh is non-negotiable. Fork is fallback only.

## Quick Summary

> Delegate parallel work to built-in subagents with task handoff. Alternative: execute directly with context preservation.

## Available Invocations

Pick by **capability**, not by harness brand. Probe the tool registry top-down;
use the first tier available.

| Capability | Invocation | Context behavior |
|---------|------------|-----------------|
| **Acceptance-native subagents** | Delegate tool with an acceptance contract (`criteria`, `verify`, `stopRules`) | Fresh by default or explicit; child self-corrects in the same context (see `goals.md`) |
| **Isolated subagents** | Delegate tool with `agent` + `task` only | Always isolated; parent re-delegates with feedback until criteria pass |
| **Headless CLI** | `<agent-cli> --print/-p "task" > out.md` (parallel via `&` + `wait`) | Fresh process per call; no agent types |
| **Universal fallback** (any agent) | Execute directly; file-based handoff (`write` → next stage `read`) | Fresh-context by construction |

## Command Details

### Acceptance-native (child self-corrects)

Tool shapes vary by harness — two common examples:

```typescript
// Example A — Agent() style
Agent({
  subagent_type: "[type]",
  prompt: "Full task description with context and instructions",
  description: "Short 3-5 word label",
  // Optional:
  model: "provider/model",       // model override
  run_in_background: true,       // parallel: multiple Agent() calls in one message
  max_turns: 30,                 // cap turns
})
```

```typescript
// Example B — Task() style
Task({
  subagent_type: "[type]",
  prompt: "Full task description with context and instructions",
  description: "Short 3-5 word label",
})
```

In both cases pass the acceptance contract (`criteria`, `evidence`, `verify`,
`stopRules` — see `goals.md`) in the harness's native shape, and fresh context
per the tool's default (override only when the tool defaults to fork).

**Parallel:** dispatch multiple delegate calls in a single message with the
harness's background option. You will be notified on completion — never poll
or sleep.

**Custom agents:** project/global agent definition files (e.g. `<name>.md`
under the harness's agents directory) are auto-discovered — prefer named types
over embedding roles in prompts.

### Isolated subagents (parent loops)

When the harness offers subagents but no acceptance contract:

```typescript
subagent({ agent: "[type]", task: "..." })
```

Always isolated context. No `reads` param — embed file paths in the task string.
The parent evaluates the result against the acceptance criteria and re-delegates
with feedback until they pass or max iterations exhaust.

### Generic (fallback)

When subagent is not available:

1. Execute task directly in current context
2. Save outputs to files
3. Read files in next task for continuation

```typescript
write({ path: "output.md", content: "..." })
read({ path: "output.md" })
```

---

## Deterministic dispatch

Read `detected_cli` from `stelow.json#workflows[].detected_cli`. Emit the invocation shape for that capability tier:

| `detected_cli` | **Required** invocation |
|---|---|
| `acceptance-native` | Delegate tool with acceptance contract — child self-corrects; fresh context per the tool's default (override only when it defaults to fork) |
| `isolated` | Delegate tool with `agent` + `task` — embed file paths in the task string; parent re-delegates with feedback |
| `headless` | `<agent-cli> --print/-p "task" > out.md` — fresh process per call |
| `generic` | Execute directly; save output to file; next stage reads it |

### PARALLEL dispatch

| `detected_cli` | **PARALLEL** invocation |
|---|---|
| `acceptance-native` | Multiple delegate calls in the same message with the harness's background option |
| `isolated` | Multiple delegate calls (harness may queue serially — no true concurrency guaranteed) |
| `headless` | `<agent-cli> --print "task A" > a.md & <agent-cli> --print "task B" > b.md & wait` (POSIX) |
| `generic` | `cmd_a & cmd_b & wait` (POSIX) |

**Selection rule:** Read `detected_cli` from `stelow.json`, pick the row, emit verbatim.

---

## Fallback — harness without acceptance-native subagents

| Feature | Isolated subagents | Acceptance-native |
|---------|-------------------|-------------------|
| Invocation | Delegate with `agent` + `task` | Delegate with acceptance contract |
| File reads | Embed in task string | Explicit param where supported |
| Self-correction | Parent-controlled loop | Native (child fixes gaps before returning) |
| Parallel fan-out | Sequential calls possible | Background concurrency where supported |

### How to detect the tier

Probe the harness, top-down — no package-manager checks:

1. Tool registry exposes a delegate tool with an acceptance/criteria contract → `acceptance-native`
2. Tool registry exposes a delegate/subagent tool without one → `isolated`
3. An agent CLI binary answers `--version`/`--help` on PATH → `headless`
4. Otherwise → `generic`

The orchestrator reads `detected_cli` from `stelow.json` and picks the correct row.

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

## Input Files

Subagents should receive inputs as explicit artifacts, not inherited conversation history. The canonical inputs are:

| Artifact | Path | Frontmatter fields | Used by |
|---|---|---|---|
| `spec-product.md` | `.stelow/{date}/{dir}/plans/spec-product_{v}.md` | `appetite`, `review_mode`, `domains_detected`, `appetite_fit` | All proposal/review/strategic-context subagents |
| `tech-recon.md` | `.stelow/{date}/{dir}/tech/tech-recon.md` | — | Interface proposals, alignment checks |
| `spec-tech.md` | `.stelow/{date}/{dir}/plans/spec-tech_{v}.md` | — | Scope executors |
| `scope-contract.json` | `.stelow/{date}/{dir}/scopes/{scope-id}.json` | `acceptance_criteria`, `verify_commands` | Scope executors |
| `stelow.json` | `stelow.json` (project root) | `workflows[].config.{appetite,review_mode,domains_detected}`, `workflows[].detected_cli`, `workflows[].draftContent`, `workflows[].scopes[]` | Strategic context subagents (canonical source of truth) |

**Why this matters:** `spec-product.md` frontmatter is the **single source of truth** for `appetite`, `review_mode`, and `domains_detected`. Subagents should read it explicitly rather than relying on the orchestrator passing these values in the task string. This makes input auditable, reproducible, and CLI-agnostic.

> **v0.53.0:** `stelow.json` is the single source of truth for all workflow state. `.stelow/{date}/{hash}/index.json` no longer exists. The host adapter reads from `stelow.json` directly.

---

## Headless CLI fallback (any agent)

When no native subagent tool is available, spawn the coding-agent CLI as a
headless subprocess (`--print`/`-p` flag varies by harness — use the harness's
documented non-interactive mode):

```bash
<agent-cli> --print "generate report and save to output.md"
<agent-cli> --print "You are a code reviewer. Review this diff for correctness." > review.md
```

### Parallel headless

```bash
<agent-cli> --print "task A" > output-a.md &
<agent-cli> --print "task B" > output-b.md &
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
1. Probe the harness top-down
   │
   ├── acceptance-native? →  ✅ Delegate with contract (child self-corrects)
   ├── isolated subagents? →  ⚠️ Delegate agent+task (parent loops w/ feedback)
   ├── headless CLI binary? →  ⚠️ <agent-cli> --print (fresh process per call)
   ├── generic/unknown? →  ❌ Universal Fallback (write + read)
   └── subagent failed? →  ❌ retry once → Headless CLI → Universal Fallback
```

**Summary by quality:**
1. ✅ **Acceptance-native** — delegate tool with contract, background parallelism where supported, fresh by default
2. ⚠️ **Isolated** — same delegation without contract, parent-controlled loop
3. ⚠️ **Headless CLI** — no agent types, parallel via `&` + `wait`
4. ❌ **Universal Fallback** — synchronous, same session. Works on EVERY agent
