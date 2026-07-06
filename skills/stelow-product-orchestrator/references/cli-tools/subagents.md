# Subagents

## ⛔ CRITICAL RULE — READ FIRST

> **EVERY stelow subagent call passes `context: "fresh"` EXPLICITLY.**
>
> - Stelow never relies on per-agent defaults — even if the packaged agent defaults to `fresh`.
> - Stelow never relies on CLI-level defaults — even if the CLI defaults to `fresh`.
> - The only case where `context: "fork"` is acceptable: a subagent invocation the workflow design didn't anticipate (last-resort fallback).
> - **Why this matters:** pi-subagents' packaged `worker`/`planner`/`oracle` default to `fork` via their frontmatter `defaultContext: "fork"`. If you forget `context: "fresh"`, your worker silently inherits the orchestrator's contaminated context (context rot ~73% → ~33% rule adherence over 16 turns, Gamage 2026) — defeating stelow's whole point.
> - **Enforcement:** every example in this file passes `context: "fresh"`. Every skill's subagent invocation in `skills/*/` passes `context: "fresh"`. Do not deviate.
>
> **TL;DR:** `context: "fresh"` is non-negotiable. Fork is fallback only.

## Quick Summary

> Delegate parallel work to built-in subagents with task handoff. Alternative: execute directly with context preservation.

## Available Commands by CLI

| CLI | Command | Package | Available | Context behavior |
|-----|---------|---------|-----------|-----------------|
| pi | `subagent({ agent, task })` | pi built-in | ✅ | **Always isolated context** (separate `pi` process). No `context` parameter. |
| pi | `subagent({ agent, task, context, reads, acceptance })` | pi-subagents (`npm:pi-subagents`) | ✅ | Adds `context: "fresh" \| "fork"` param (default **`fresh`**), `reads`, `acceptance`, parent-child contracts. Use this when stelow needs deterministic fresh-context semantics. |
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
  context: "fresh"  // pi-subagents explicit; default is fresh, but pass explicitly for clarity
})
```

| Package | Source |
|---------|--------|
| pi-subagents | nicobailon |

**Default:** `fresh` (zero parent history — child runs in a separate `pi` process). Pass `context: "fork"` ONLY when child needs parent's filtered session history (rare in stelow).

**Packaged-agent gotcha (pi-subagents):** The following packaged agents ship with `defaultContext: "fork"` in their frontmatter — they run fork UNLESS you override with explicit `context: "fresh"`:

| Agent | Default context | Stelow's actual use |
|---|---|---|
| `oracle` | `fork` | NOT used in stelow (hypothetical only) |
| `planner` | `fork` | NOT used in stelow (hypothetical only) |
| `worker` | `fork` | Used by scope-executor; **MUST override with `context: "fresh"`** |
| `scout`, `reviewer`, `researcher`, `delegate`, `context-builder` | `fresh` (no `defaultContext`) | No override needed |

Stelow ALWAYS passes explicit `context: "fresh"` to defend against packaged agents that default to fork. This is the documented contract — no reliance on per-agent defaults.

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

Interface Alternatives — generate 1/3/5 proposals in parallel from `spec-product.md` frontmatter (`appetite`, `review_mode`, `domains_detected`) plus the spec body. Each worker runs **fresh** with **explicit reads** — proposals must be independent of the orchestrator's deliberation history.

```typescript
subagent({
  tasks: [
    { agent: "worker", task: "Generate Proposal A for [context]. Full format.", reads: [".stelow/{date}/{dir}/plans/spec-product_{v}.md", "tech-recon.md"] },
    { agent: "worker", task: "Generate Proposal B for [context]. Full format.", reads: [".stelow/{date}/{dir}/plans/spec-product_{v}.md", "tech-recon.md"] },
    { agent: "worker", task: "Generate Proposal C for [context]. Full format.", reads: [".stelow/{date}/{dir}/plans/spec-product_{v}.md", "tech-recon.md"] },
    { agent: "worker", task: "Generate Proposal D for [context]. Full format.", reads: [".stelow/{date}/{dir}/plans/spec-product_{v}.md", "tech-recon.md"] },
    { agent: "worker", task: "Generate Proposal E for [context]. Full format.", reads: [".stelow/{date}/{dir}/plans/spec-product_{v}.md", "tech-recon.md"] }
  ],
  concurrency: 5,
  context: "fresh"
})
```

### Single (Step 3 - Hybrid)

```typescript
subagent({
  agent: "worker",
  task: "Read proposals A-E from interfaces_v{N}.md. Generate Hybrid combining best elements.",
  reads: [".stelow/.../interfaces/interfaces_v{N}.md"]
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

## Deterministic CLI dispatch (per-CLI direct syntax)

**Do NOT rely on LLM translation of intent.** Read `detected_cli` from `.stelow/{date}/{dir}/index.json` (populated by `setup.md`) and emit the **direct invocation syntax** for that CLI. Each CLI below shows the literal call shape the orchestrator must use. The skill author writes the template; the orchestrator selects the row.

**Universal rule across all CLIs:** every stelow subagent invocation passes `context: "fresh"` (pi-subagents) OR relies on the CLI's always-isolated semantics (built-in pi, opencode, claude-code, codex). The result is the same: child sees only what was explicitly handed to it.

| `detected_cli` | **Required** invocation | Why this exact shape |
|---|---|---|
| `pi` (built-in) | `subagent({ agent, task, reads })` | Built-in `subagent()` always runs in isolated `pi` process. No `context` param exists — no way to inherit parent history. Pass `reads` for inputs. |
| `pi` (pi-subagents) | `subagent({ agent, task, reads, context: "fresh", acceptance? })` | `context: "fresh"` is **mandatory** to override packaged `worker`/`planner`/`oracle` defaults (`defaultContext: "fork"`). Without it, worker silently runs fork and inherits parent's context rot. |
| `opencode` | `delegate_task({ agent, prompt, files })` (or built-in `task` tool) | Built-in always isolated. Embed inputs in `prompt` or pass via `files`. |
| `claude-code` | `Task({ subagent_type, prompt, description })` | Built-in always isolated context window. Pass inputs in `prompt` or as attached files. |
| `codex` | `/agent <task-with-embedded-inputs>` or `agent.run({ task })` | `/agent` always spawns independent thread. Embed file references in task string. |
| `generic` | Execute directly in current session; save output to file; next stage reads file. | No subagent support. File-based handoff IS fresh-context by construction. |

### PARALLEL dispatch (per-CLI, verified 2026)

**Parallel subagent invocation differs per CLI — use the per-row shape below.** Stelow prefers research-parallelism (independent files, fresh context, zero inter-agent comms); parallel code-execution is opt-in and uses these shapes. For parallel SCOPE execution specifically, see scope-executor Step 6 + Step 8 (`actual_files` overlap capture) — file overlap is detected post-execution, not pre-execution.

| `detected_cli` | **PARALLEL** invocation | Notes (verified 2026) |
|---|---|---|
| `pi` (built-in) | Multiple `subagent(...)` calls in same turn | Runtime queues serially by default — no true concurrency |
| `pi` (pi-subagents, nicobailon) | `subagent({ tasks: [...], concurrency: N, context: "fresh" })` | Native fan-out via `tasks[]` array + `concurrency`. Each child gets fresh context. |
| `opencode` | Multiple Task calls in **single** LLM response → `Promise.all` (PR #14196). Cross-message fan-out serializes (issue #29638, open as of 2026-05). Fallback: headless `&` + `wait`. | Buggy cross-message: avoid relying on multi-turn parallel. |
| `claude-code` | Multiple `Task(...)` invocations in same assistant turn. SDK: `agents: [...]` parameter (parallel agent invocation). | Docs page `code.claude.com/docs/en/agents` — "Run agents in parallel". |
| `codex` | Multiple subagent spawns via TOML agent config; `codex exec` instances with `&` + `wait`. | OpenAI docs explicitly support parallel subagents (concepts/subagents). |
| `generic` | `cmd_a & cmd_b & wait` (POSIX) | Shell-based fan-out; each process is independent. |

**Parallel scope prevention (CLI-agnostic):**

For parallel scope execution that touches shared files, use the file-reservation lock protocol in `file-locking.md` — works on every CLI without runtime hooks or per-CLI flags. Declared `[TARGET_FILES]` (spec-tech.md convention) + acquired locks + post-execution `git diff` audit form the prevention → detection → response pipeline.


**Selection rule (deterministic):**
1. Read `.stelow/{date}/{dir}/index.json` → `detected_cli`.
2. Pick the row above for that CLI.
3. Emit the call shape **verbatim** with `reads` populated from the artifact paths in this file's "Input Files" table.
4. **For `pi-subagents`: always pass `context: "fresh"`** even though it's "the default" — packaged agents override the default. This is stelow's defensive contract.
5. **For non-pi CLIs: do NOT write `context: "fresh"`** — they ignore it and it confuses copy-paste readers.

**The `context: "fork"` exception (rare):** A subagent invocation the workflow design didn't anticipate, where the child genuinely needs parent's accumulated reasoning that cannot be extracted to an artifact. Document why fork is necessary at the call site. Default assumption: fresh is correct.

**Skill-author rule:** Document the pattern in the intent language ("fresh context, explicit reads") in `SKILL.md`. The orchestrator handles the per-CLI translation at the call site, not the LLM.

---

## When `fork` is necessary (fallback only — never default)

**`fork` is a last-resort fallback for subagent invocations the workflow design did NOT anticipate.** For every workflow-anticipated call, use `fresh` + explicit `reads` + explicit task string. This is stelow's documented contract.

If a subagent invocation the workflow design didn't anticipate appears, here's the audit:

| Apparent need | What you actually need | Why fork is wrong (and the right fix) |
|---|---|---|
| "Child needs parent's error context to debug" | Write the error + stack trace to a file; pass via `reads` | Conversation history isn't auditable; debug output IS — write it |
| "Child needs parent's intermediate reasoning" | Write a session summary to a file before delegation; pass via `reads` | Parent's monologue contains rejected alternatives and stale hypotheses — child should see only the curated summary |
| "Child needs parent's been-deliberating-back-and-forth" | Capture the decision + final options in a file; pass via `reads` | Back-and-forth usually means indecision — child shouldn't inherit that |
| "Multi-turn dialog with shared scratch space" | Re-architect as discrete steps with file artifacts between them | Shared scratch space is exactly context rot fuel |
| "Child builds incrementally on parent's partial work" | Save partial work to file; child reads file fresh each time | Inheritance loses the file boundary's auditability |
| "Strategic-context skill needs user's verbatim request" | Put the verbatim request in the `task` string (orchestrator captures it); read `index.json` | The skill's job is to apply its lens — not to validate parent's choice of skill. See worked example below. |

**The genuine fork case (rare):** an interactive debugging loop where parent and child exchange messages faster than they can write files, AND the diagnostic signal is genuinely ephemeral (live process state, can't snapshot). For stelow's batch workflow use cases: never applies.

**Rule:** before reaching for `fork`, ask "can I write the relevant context to a file in <50ms?" If yes, do that and use `fresh` + `reads`. If no, the workflow design itself needs revisiting — the call probably shouldn't be delegated at all (do it synchronously instead).

**Why this is fallback-only, not a normal option:**
- Context rot: ~73% → ~33% rule adherence over 16 turns (Gamage 2026). Fork transfers rot.
- Contamination: parent's rejected hypotheses look like "context" to the child but are noise.
- Audit gap: conversation history isn't reproducible; files are.
- Silent regression: packaged pi-subagents default to fork. If you forget `context: "fresh"`, your call silently degrades.

---

## Conceptual Intent: `fresh` vs `fork` (legacy reference)

**In stelow, this is a one-row table.** `fresh` is the rule. `fork` is the fallback documented above.

| Intent | What it means conceptually | When to express this intent |
|--------|---------------------------|-----------------------------|
| `fresh` (mandatory for all stelow calls) | Clean slate — child sees only what you explicitly hand it via `reads` + task string. No biased history, no degraded context, no inherited assumptions | **Every stelow subagent invocation.** See "Deterministic CLI dispatch" table for per-CLI invocation. |
| `fork` (fallback only, see "When fork is necessary" above) | Child inherits filtered parent context | ONLY when a workflow-anticipated call genuinely needs parent's ephemeral reasoning that cannot be artifactized. Default assumption: use `fresh`. |

**Key insight:** `fork` means the child gets the parent's potentially contaminated context (context rot ~73% → ~33% rule adherence over 16 turns, Gamage 2026). `fresh` means the child sees the inputs with full rule awareness, untainted by the parent's degraded context. **Default to `fresh` + explicit `reads`** — the project's principle is "disk-based artifacts; independent file outputs" (README), and that applies to INPUT as well as output.

---

## Input Files (canonical artifacts to pass via `reads`)

Subagents should receive inputs as **explicit artifacts**, not inherited conversation history. The canonical inputs are:

| Artifact | Path | Frontmatter fields | Used by |
|---|---|---|---|
| `spec-product.md` | `.stelow/{date}/{dir}/plans/spec-product_{v}.md` | `appetite`, `review_mode`, `product_type`, `domains_detected`, `appetite_fit` | All proposal/review/strategic-context subagents |
| `tech-recon.md` | `.stelow/{date}/{dir}/tech/tech-recon.md` | — | Interface proposals, alignment checks |
| `spec-tech.md` | `.stelow/{date}/{dir}/plans/spec-tech_{v}.md` | — | Scope executors |
| `scope-contract.json` | `.stelow/{date}/{dir}/scopes/{scope-id}.json` | `acceptance_criteria`, `verify_commands`, `stop_rules`, `target_files?` | Scope executors |
| `scope-actual-files.json` | `.stelow/{date}/{dir}/scopes/_all-actual-files.json` | `scope_id`, `actual_files` (paths from `git diff --name-only`) | Execution report overlap detection (scope-executor Step 8) |

**Why this matters:** `spec-product.md` frontmatter is the **single source of truth** for `appetite`, `review_mode`, and `domains_detected`. Subagents should read it explicitly rather than relying on the orchestrator passing these values in the task string or inheriting from history. This makes input auditable, reproducible, and CLI-agnostic.

---

## Output Files

For tasks that save output, use meaningful paths:

```
.stelow/{YYYY-MM-DD}/{_dir}/interfaces/interfaces_v{N}.md
.stelow/.../strategic/{name}.md
```

---

### Multi-dimensional parallel critique (4 reviewers + consolidation)

Launch 4 parallel reviewers with different critique dimensions,
each independent (fresh context). After all complete, consolidate.

```typescript
// Step 1: 4 parallel reviewers
subagent({
  tasks: [
    { agent: "reviewer", task: `Critique plan for FLOWS and STATES.\nInput: spec-product.md\nFocus: primary flows, alternative, error, rollback, sync; states: empty, loading, partial, error\nSave to critiques/critique-flows-states.md`, output: "critiques/critique-flows-states.md", context: "fresh" },
    { agent: "reviewer", task: `Critique plan for DATA and SYSTEM.\nInput: spec-product.md\nFocus: validation, defaults, null handling; API contracts, timeouts, retry\nSave to critiques/critique-data-system.md`, output: "critiques/critique-data-system.md", context: "fresh" },
    { agent: "reviewer", task: `Critique plan for AFFORDANCES and UX.\nInput: spec-product.md\nFocus: hover/focus/disabled states, touch targets, keyboard nav\nSave to critiques/critique-affordances-ux.md`, output: "critiques/critique-affordances-ux.md", context: "fresh" },
    { agent: "reviewer", task: `Critique plan for FEASIBILITY.\nInput: spec-product.md\nFocus: architecture, stack, security, effort estimation\nSave to critiques/critique-feasibility.md`, output: "critiques/critique-feasibility.md", context: "fresh" }
  ],
  concurrency: 4
})

// Step 2: Consolidate all 4 reports
subagent({
  agent: "worker",
  task: `Read 4 critique reports and consolidate:\n1. critiques/critique-flows-states.md\n2. critiques/critique-data-system.md\n3. critiques/critique-affordances-ux.md\n4. critiques/critique-feasibility.md\n\nRules: merge, deduplicate (keep specific), classify (BLOCKER/QUESTION/MINOR).\nSave to .stelow/{date}/{slug}/critiques/critique-report.md`,
  reads: ["critiques/critique-flows-states.md", "critiques/critique-data-system.md", "critiques/critique-affordances-ux.md", "critiques/critique-feasibility.md"]
})
```

### Dynamic fanout (selected approaches)

When the number of tasks is dynamic (user-selected strategic-context approaches or domain libraries). Each delegate runs **fresh** with **explicit reads**. The `reads` list depends on which stage invokes them:

| Stage | `reads` source | Why |
|---|---|---|
| `context:10` / `context:20` (strategic-context — runs BEFORE spec-product.md exists) | `index.json` (appetite + review_mode + domains_detected + detected_cli) + optional reference files | `spec-product.md` doesn't exist yet. The task string must carry user's verbatim request. |
| Shape Up, Plan Critique, Interface Alternatives, Scope Execution (runs AFTER spec-product.md exists) | `spec-product.md` (frontmatter + body) + stage-specific artifacts (`tech-recon.md`, `critiques/*.md`, `scope-contract.json`, etc.) | Canonical product source of truth. |

**Strategic-context worked example (context:10 — runs at workflow start, before any spec exists):**

```typescript
subagent({
  tasks: selectedApproaches.map(approach => ({
    agent: "delegate",
    task: `Apply cali-product-${approach.skill} to this user request.

USER REQUEST (verbatim):
"""
${userOriginalRequest}
"""

Appetite: ${configAppetite}
Review Mode: ${configReviewMode}
Detected domains: ${configDomainsDetected}
Workflow dir: ${WF_DIR}

Read .stelow/{date}/{dir}/index.json for full config. Do NOT inherit orchestrator deliberation.
Save output to ${approach.outputPath}.`,
    output: approach.outputPath,
    reads: [".stelow/{date}/{dir}/index.json"],
    context: "fresh"
  })),
  concurrency: selectedApproaches.length
})
```

**Why this works without `context: "fork"`:**
- The user's verbatim request is in the `task` string — the skill sees the actual ask, not a parent's interpretation of it.
- `index.json` provides appetite + review_mode + domains_detected — the skill knows the workflow constraints.
- `context: "fresh"` keeps each skill independent — N parallel skills produce N independent analyses on the same input. Cross-contamination is the failure mode; fresh prevents it.
- Parent's deliberation about WHY these skills were selected is NOT load-bearing. The skill's job is to apply its lens to the request, not to validate the parent's choice.

**Shape-up / plan-critique / interface / scope worked example (after spec-product.md exists):**

```typescript
subagent({
  tasks: selectedApproaches.map(approach => ({
    agent: "delegate",
    task: `Apply cali-product-${approach.skill} per spec-product.md.

Read the spec (frontmatter has appetite, review_mode, domains_detected, appetite_fit; body has Problem, Solution, Scope, Risks, DoD).
Do NOT inherit orchestrator deliberation.
Save output to ${approach.outputPath}.`,
    output: approach.outputPath,
    reads: [".stelow/{date}/{dir}/plans/spec-product_{v}.md"],
    context: "fresh"
  })),
  concurrency: selectedApproaches.length
})
```

---

## Error Recovery

Subagent failures can happen (API timeout, transient errors, rate limits).
Use this pattern for graceful degradation:

### Retry Pattern (timeout-aware)

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

### What to log on failure

```json
{
  "task": "[description]",
  "attempt": 1|2,
  "status": "recovered"|"skipped"|"failed",
  "error": "[error message]",
  "stage": "[stage name]"
}
```

### Key rules

1. **Do NOT block** other parallel subagents on one failure
2. **Retry ONCE** — a second retry is overengineering for planning tasks
3. **Always log** — silent failures are worse than skipped tasks
4. **Graceful degradation** — a skipped subagent is better than a deadlocked workflow
5. **Document failures** — include in execution report so the user knows what was skipped

---

## Fallback — Headless CLI (any harness)

When no native `subagent` tool is available (e.g. pi without `pi-subagents` extension,
or a generic CLI), spawn the harness itself as a headless subprocess.
Each CLI's non-interactive mode (`-p`/`--print`) runs a prompt and exits —
this IS a subagent, just called via CLI instead of a tool.

**No model flag needed** — uses the user's default model.

### Per-CLI command

| CLI | Command |
|-----|---------|
| pi | `pi --print \"$task\"` |
| Claude Code | `claude -p \"$task\"` |
| OpenCode | `opencode -p \"$task\"` |
| Codex | `codex -p \"$task\"` |

### Usage pattern

```bash
# Instead of subagent({ agent: "worker", task: "generate report" }):
pi --print "generate report and save to output.md"

# Or with structured output for verification:
claude -p --output-format json \
  'Read output.md. Return JSON: { valid: bool, issues: [] }'
```

### When to use

| Scenario | Native subagent | Headless CLI fallback |
|----------|----------------|----------------------|
| Extension installed | ✅ Preferred | ❌ Not needed |
| Extension missing | ❌ Fails | ✅ Works |
| Need structured output | ✅ Works | ⚠️ Requires prompt instruction |
| Pipeline of tasks | ✅ Subagent returns control | ✅ Command exits, next runs |
| Parallel fan-out | ✅ Built-in | ⚠️ Background each with `&` + wait |

### Parallel headless (POSIX)

```bash
# Launch multiple headless subagents in parallel
pi --print "task A" > output-a.md &
pi --print "task B" > output-b.md &
pi --print "task C" > output-c.md &
wait
echo "All done"
```

---

## Fallback (Generic)

If no subagent AND no headless CLI available:
- Execute tasks directly
- Save outputs to files
- Read files for continuation