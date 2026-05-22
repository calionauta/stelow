---
name: cali-scope-executor
description: >
  [Cali] Reads an approved product plan with typed scopes (feature, optimization, spike, test-*)
  and routes each scope to its correct executor. Acts as the autonomous overnight
  "set and forget" orchestrator — the equivalent of the goal command (see `references/cli-tools/goals.md`) for approved plans.
  For test-* scopes, enforces hard blocks (mutation score, security gates).

  Trigger keywords: execute plan, run scopes, autonomous execution, scope executor,
  feature implementation, optimization run

  NOT for: planning, shaping (use cali-shape-up or cali-tech-planning instead)
---

# Execution Executor

## Goal

Execute every scope in dependency order, using the right executor per scope type, producing a clear final report.

## When to Use

Activate when:
- User wants to execute an approved technical plan
- Running scopes after Tech Planning approval
- Autonomous execution phase of cali-product-workflow

**Do NOT activate for:**
- Planning or shaping (use cali-shape-up)
- Technical planning (use cali-tech-planning)

## Input

The skill operates on the **approved plan document** — the artifact persisted at
`docs/{YYYY-MM-DD}/{slug}/plans/spec-tech_{v}.md` after the Plannotator gate passes.

Where `{slug}` is a short kebab-case identifier for the project (e.g. `login-system`,
`payment-refactor`) and `{v}` is an auto-incremented version number.

The plan must contain scopes with type annotations:
- `[TYPE] feature` — implement new functionality
- `[TYPE] optimization` — improve a measurable metric (must include `[METRIC]`)
- `[TYPE] spike` — research or prototype
- `[TYPE] test-unit` — unit tests with mutation validation
- `[TYPE] test-integration` — integration tests with real dependencies
- `[TYPE] test-security` — SAST and security gates
- `[TYPE] test-behavior` — behavioral testing for agent workflows

If the plan has the optional **"Execution routing"** section (from cali-product-workflow), use it directly. Otherwise, infer routing from `[TYPE]` tags.

## Role

You are an **execution orchestrator** — a senior engineering lead running a shift-left review of an approved plan. Your job is NOT to redesign or question the plan (that already happened in earlier phases). Your job is to **execute every scope correctly**, in dependency order, using the right tool for each type.

You have access to all pi tools and subagents. Use them.

## Scope Types & Executors

| Type | Executor | Description |
|------|----------|-------------|
| `feature` | `worker` + `/supervise` | Standard feature implementation |
| `optimization` | `autoresearch-create` | Performance/size improvement |
| `spike` | `worker` + `/supervise` | Research or prototype |
| `test-*` | `worker` + testing gates | Test coverage (see below) |

### Executor Override (`[EXECUTOR]`)

When `[EXECUTOR]` is present in a scope, use that instead of the default:
```
[SCOPE-4]
[TYPE] feature
[EXECUTOR] autoresearch
[METRIC] Average cyclomatic complexity < 10
```

## Workflow

### Step 1: Read and parse the plan

Read `docs/{YYYY-MM-DD}/{slug}/plans/spec-tech_{v}.md`:
- Extract all scopes
- Identify `[TYPE]`, `[DoD]`, `[ACCEPTANCE]`, `[EXECUTOR]` tags
- Build dependency graph from sequencing

### Step 2: Create execution worktree (optional)

**Only if:** modifying code in shared repo AND parallel workflows exist.

Ask the user:
- If yes: `git worktree add` per scope
- If no: proceed in current worktree

Single-scope workflows can skip worktree.

### Step 3: Execute scopes in sequence

For each scope:
1. Read scope details (DoD + acceptance criteria)
2. Activate supervisor: `start_supervise({outcome: "[scope goal]"})`
3. Run executor based on type:
   - `feature` → `/sisyphus` + `/supervise`
   - `optimization` → `autoresearch-create`
   - `spike` → `/sisyphus` + `/supervise`
   - `test-*` → `/sisyphus` + testing gates
4. Record results in execution log

### Step 4: Testing gates

For `test-*` scopes:
- **test-unit**: Mutation score ≥ 50%
- **test-integration**: All integration tests pass
- **test-security**: SAST scan with no HIGH/CRITICAL
- **test-behavior**: Behavioral test suite passes

If gates fail:
- `test-*` scope: **block execution**, do not proceed
- `test-regression`: warn but proceed

### Step 5: Consolidate results

Create execution report at `docs/{YYYY-MM-DD}/{slug}/reports/execution-{timestamp}.md`:
- Scopes executed (count, status)
- Failures (scope, error, action taken)
- Test gate results
- Artifacts produced

## Output Format

This skill produces:
- **Execution log** — per-scope status and results
- **Final report** — consolidated results with pass/fail

Execution report format:
```
## Execution Summary

- Total scopes: N
- Passed: X
- Failed: Y
- Blocked: Z

## Scope Results

### [SCOPE-1] feature — Status: ✅ PASS
- Executed: [timestamp]
- Executor: worker + /supervise
- Artifacts: [list]

### [SCOPE-2] optimization — Status: ⚠️ FAIL
- Executed: [timestamp]
- Executor: autoresearch
- Metric: [target] → [achieved]
- Action: [retry / skip / escalate]
```

## Gotchas

1. **Dependency order** — No scope starts before its dependencies complete
2. **Executor routing** — Use correct executor per type; `[EXECUTOR]` overrides default
3. **Test gates** — Block on `test-*` failures; warn on `test-regression`
4. **Supervisor timing** — Activate only when STARTING each scope, not during planning
5. **Worktree** — Only create if shared repo AND parallel workflows exist
6. **Failure handling** — One failed scope doesn't block the rest (unless test gate)

## Testing

### Trigger Tests
- "Execute the plan" → should trigger
- "Run all scopes" → should trigger
- "Implement the features" → should trigger
- "Plan a new feature" → should NOT trigger

### Output Tests
- Final report contains all scope results
- Test gates enforced for test-* scopes
- Failures documented with action taken

## Output Expectations

**Strong execution runs:**
- **Respect dependency order** — no scope starts before its dependencies
- **Use the right tool for each type** — worker for features, autoresearch for optimization, scout for spikes
- **Handle failures gracefully** — one failed scope doesn't block the rest
- **Produce a clear final report** — what was done, what changed, what failed

**Weak execution runs:**
- **Run everything sequentially** when parallel is safe
- **Use worker for optimization scopes** (loses the autoresearch loop advantage)
- **Ignore scope types** and treat everything as implementation
- **Block on minor failures** or reviewer feedback

## Related Skills

- **cali-tech-planning**: Produces the scopes to execute
- **cali-shape-up**: Produces the spec that feeds planning
- **cali-product-workflow**: Coordinates this skill with other phases

## Environment Adaptation

If a tool is unavailable, check:
`../../../../cali-product-workflow/references/cli-tools/`