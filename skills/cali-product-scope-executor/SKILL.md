---
name: cali-product-scope-executor
description: >
  [Cali] Reads an approved product plan with typed scopes (feature, optimization, spike, test-*)
  and routes each scope to its correct executor. Acts as the autonomous overnight
  "set and forget" orchestrator — the pi equivalent of /goal for approved plans.
  For test-* scopes, enforces hard blocks (mutation score, security gates).
metadata:
  frequency: weekly
  category: product
  context-cost: low
---

# Execution Executor

Autonomous plan execution orchestrator. Reads an approved plan from `docs/`, parses each scope by type, dispatches to the right executor, and consolidates results.

This skill is designed to run **after** the Plannotator gate approves the plan. It replaces manual step-by-step execution with a single autonomous orchestration pass.

---

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

---

## Role

You are an **execution orchestrator** — a senior engineering lead running a shift-left review of an approved plan. Your job is NOT to redesign or question the plan (that already happened in earlier phases). Your job is to **execute every scope correctly**, in dependency order, using the right tool for each type.

You have access to all pi tools and subagents. Use them.

---

## Workflow

### Step 1: Read and parse the plan

Read the approved plan file. Identify every scope and its type.

Example scope shape:
```
[SCOPE-1]
[TYPE] feature
Objective: Implement user login
Dependencies: None
DoD: User can log in with email/password
ACs: - Email and password fields validate
     - Successful login redirects to dashboard
     - Failed login shows error message
```

```
[SCOPE-2]
[TYPE] optimization
[METRIC] API P95 latency < 200ms (lower is better)
Objective: Optimize search endpoint
Dependencies: SCOPE-1
DoD: Search latency meets target
```

```
[SCOPE-3]
[TYPE] spike
Objective: Evaluate vector database options
Dependencies: None
DoD: Recommendation document with pros/cons
```

Build an execution plan respecting dependencies: scopes with no dependencies run first, dependent scopes wait.

### Step 2b: Resolve executor per scope

For each scope in the plan:
1. Check if there is an explicit `[EXECUTOR]`
2. If YES → ignore `[TYPE]`, use the specified executor
3. If NO → use default routing by type

| `[TYPE]` | `[EXECUTOR]` | Result |
|---|---|---|
| `feature` | *absent* → worker |
| `feature` | `research` → **research loop** (override) |
| `optimization` | *absent* → goals tool (see `references/cli-tools/goals.md`, Optimization Goals) |
| `optimization` | `worker` → **worker** (override) |
| `spike` | *absent* → scout + researcher |
| `spike` | `research` → **research loop** (override, rare) |
| `test-unit` | worker + mutation validation |
| `test-integration` | worker + real dependencies |
| `test-security` | worker + SAST gates |
| `test-behavior` | worker + behavioral testing |

### Step 2c: Report the execution plan

Before executing, present a clear execution plan to the user with the resolved executor:

```
📋 Execution Plan for: {plan-name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Appetite: {PoC|Focused|Comprehensive} (human-set)
Complexity Estimate: {XS|S|M|L|XL} (LLM-set)
Phase 1 (parallel):
  ⏩ [SCOPE-1] Login — feature → worker
  ⏩ [SCOPE-3] Vector DB eval — spike → scout + researcher
  ⏩ [SCOPE-4] Refactor payments — feature → subagent (override)

Phase 2 (after SCOPE-1):
  ⏩ [SCOPE-2] Search optimization — optimization → goals tool
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Human-in-loop check for Comprehensive appetite:**

```bash
# Try precise path first, then fallback to glob
APPETITE=$(grep -oP '^appetite:\s*\K\S+' .cali-product-workflow/*/*/plans/spec-product_*.md 2>/dev/null || echo "Focused")
if [ "$APPETITE" = "Comprehensive" ]; then
  echo "⚠️ COMPREHENSIVE APPETITE: Human-in-loop mode may be needed for architectural changes."
  echo "Check the workflow's 'mode' setting in index.json."
  echo "In Full Product + Tech mode, each PR/fork-point requires human approval before merge."
```

Ask the user:
```
Shall I proceed with autonomous execution? I'll report back when all scopes are complete.
```

If the user says yes, proceed autonomously. If no, ask what they'd like to adjust.

### Step 2d: Comprehensive Human-in-loop execution mode

If appetite is `Comprehensive`, **modify execution flow** for each scope:

1. LLM implements changes in a working branch
2. LLM **pauses** and presents the diff to the human
3. Human reviews and approves (or requests changes)
4. LLM applies feedback and merge
5. LLM proceeds to next scope

This is NOT a gate — it's a **per-scope review checkpoint**. The LLM does the work;
the human just validates each architectural PR before it lands.

Rationale: OWASP LLM06 (Excessive Agency) — architectural changes with high
regression risk require human authorization. This is a security measure,
not overhead.

### Step 3: Execute feature scopes (feature → goals tool)

For each scope with `[TYPE] feature`:

1. **Create a goal** using the goals tool (see `references/cli-tools/goals.md`) with the scope's DoD and ACs. The goal reference documents all patterns and fallbacks.

2. **Activate supervision** (see `references/cli-tools/supervise.md`) for the feature scope before starting implementation.
   ⚠️ Supervise ONLY during execution (Execution stage and later), never during earlier stages — it can loop on Plannotator.

3. **After scope implementation completes**, run parallel code review via subagents (see `references/cli-tools/subagents.md`):
   - One reviewer for correctness and regressions
   - One reviewer for simplicity and code quality (KISS, DRY, function/file size limits)

4. **Apply feedback:** synthesize reviewer findings and apply fixes worth doing now

5. **If the scope involves UI/visual changes**, run quality checks:
   - Use `cali-product-ux-critique` in Live Site or Codebase mode — accessibility (WCAG POUR), Nielsen heuristics, visual hierarchy, cognitive load, emotional journey, design personas, consistency, mobile/responsive, AI slop detection.

6. **If the scope is a codebase-only change** (no UI), run:
   - Use `cali-product-codebase-critique` — architecture, data flow, API contracts, performance, theming, AI slop in code.

6. **DoD verification** (see Step 7) — scope is NOT complete until all DoD items pass.

### Step 4: Execute optimization scopes (optimization → goals tool)

For each scope with `[TYPE] optimization`:

1. **Create an optimization goal** using the goals tool (see `references/cli-tools/goals.md` → Optimization Goals). The goals reference documents acceptance patterns, benchmark verify commands, and iteration loops.

2. **Set a stopping condition:**
   - If metric target is defined in the plan: stop when target is met
   - If no target: run for a reasonable number of iterations (5-10) or until improvements plateau

3. **When optimization completes**, run parallel code review (see `references/cli-tools/subagents.md`)
4. **DoD verification** (see Step 7)

### Step 5: Execute spike scopes (spike → scout + researcher)

For each scope with `[TYPE] spike`:

1. **Run parallel investigation via subagents** (see `references/cli-tools/subagents.md`):
   - **scout**: investigate existing codebase for the objective — find relevant files, patterns, constraints
   - **researcher**: research best practices and solutions for the objective — concrete options with pros/cons
   Concurrency: 2, context: fresh
2. **Consolidate findings** into a recommendation document at the spikes subdirectory
3. **If the spike reveals a code change is needed**, optionally run parallel review
4. **DoD verification** (see Step 7)

### Step 6: Handle dependencies between scopes

- Scopes without dependencies can run **in parallel** (up to reasonable concurrency)
- If a scope depends on another, wait for it to complete first
- Use `subagent` with `async: true` and check status periodically for parallel phases
- After all scopes in a phase complete, proceed to the next phase

### Step 7: Compliance Check

Before generating the final report, cross-reference the original plan (spec-tech.md) with what was executed:

1. **Coverage:** was every scope in spec-tech.md executed?
   - If a scope was skipped: document the reason
   - If extra scopes were created: document the justification
2. **DoD:** did each executed scope meet its Definition of Done?
   - If not: document the gap
3. **Principles:** read `cali-product-code-standards` (skill)
   and check if principles were followed in the generated code
   - If violations were detected by parallel-review: were they fixed?
4. **Verification result:** APPROVED | CAVEATS | REJECTED

### Step 8: Report results

After all scopes are executed and compliance verified, produce a consolidated report and save it:

**Save to:** `docs/{YYYY-MM-DD}/{slug}/execution-report.md`

```
📊 Execution Results: {plan-name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [SCOPE-1] Login — feature — DONE (3 files changed, 2 reviews passed)
✅ [SCOPE-2] Search optimization — optimization — DONE (latency 180ms, target <200ms ✓)
✅ [SCOPE-3] Vector DB eval — spike — DONE (recommendation in docs/spikes/)

Timeline: {total duration}
Commits: {commit hashes for each scope}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next steps:
- Review and merge branches
- Handoff to Verification: run test suite, code review, UI/browser testing
```

---

## Parallel Execution Rules

- **Independent scopes can run in parallel.** Use subagent's `async: true` + `concurrency` to run multiple scopes simultaneously.
- **Dependent scopes must wait.** If SCOPE-2 depends on SCOPE-1, do not start SCOPE-2 until SCOPE-1 is complete and reviewed.
- **Worktree isolation** is available via `worktree: true` for scopes that might touch overlapping files. Use it when multiple feature scopes modify the same area.
- **Reasonable concurrency:** 2-3 parallel scopes maximum unless the plan explicitly allows more. Running too many in parallel increases the risk of conflicts.

---

## Error Handling

- **If a worker fails** (crash, stuck, timeout): note it, log the error, and move to the next scope. Do not block the entire execution on one failure.
- **If an optimization goal fails:** check the log, fix if trivial, otherwise skip and note it.
- **If a reviewer finds blocking issues:** flag them but continue execution. Report them in the final summary. Do not halt the pipeline for review findings — the user will address them.
- **If a spike is inconclusive:** document what was learned and recommend next steps.

---

## Execution Modes

This skill supports two modes, chosen at the start:

| Mode | Behavior |
|------|----------|
| **Full autonomous** | Execute all scopes without pausing. Report at the end. Best for overnight runs. |
| **Scope-by-scope** | Execute one scope, present results, ask to proceed. Best for interactive oversight. |

The default is **Full autonomous**. Ask the user if they want scope-by-scope instead.

---

## Workflow Position

This skill runs **after** the Plannotator gate approves the plan, replacing manual execution:

```
1. Shape Up Planning → spec-product.md (business rules, scope, risks)
2. [Optional] Interface Alternatives → interfaces.md (wireframes, proposals)
3. Product Critique → gap analysis on product spec + revision
4. Plannotator Gate → approves spec-product.md ← PRODUCT APPROVED
5. Tech Planning Sequencing → spec-tech.md (product context + tech scopes)
6. Execution Executor
   ├── Read spec-tech.md (has product context + typed scopes)
   ├── Report execution plan → user confirms
   ├── Execute features → worker + parallel-review
   ├── Execute optimizations → goals tool (see goals.md, Optimization Goals)
   ├── Execute spikes → scout + researcher
   └── Report consolidated results to execution-report.md
7. [HANDOFF] → Verification stage (full test suite, code review, UI/browser testing)
   See the `cali-product-testing-execution` skill for the testing protocol.
```

---

## How to invoke

### With supervision (recommended for autonomous execution)

Activate execution steering (see `references/cli-tools/supervise.md`) before starting:
```text
Outcome: Execute the approved plan routing scopes correctly. Save report to execution-report.md.
```

After supervision confirms, load this skill.

### Without supervision

Read this SKILL.md and follow the steps directly.

### From a parent agent (programmatic)

Delegate to a subagent (see `references/cli-tools/subagents.md`):
- Agent: `delegate` or `worker`
- Skills: `cali-product-scope-executor` + `goals` (optimization goals via subagent + acceptance)
- Context: fork

## Interaction with Tools

| Concern | Reference |
|---------|-----------|
| Goal creation and tracking | `references/cli-tools/goals.md` |
| Subagent delegation (worker, reviewer, scout, researcher) | `references/cli-tools/subagents.md` |
| Execution steering | `references/cli-tools/supervise.md` |
| Optimization goals | `references/cli-tools/goals.md` (Optimization Goals section) |
| Visual review gate | `references/cli-tools/plannotator.md` |

## Environment Adaptation

If a tool is unavailable, check:
`references/cli-tools/`

## Input Detection (Standalone Mode)

When called outside the workflow with no pre-approved spec-tech.md:

```
Input:
  ├── User provided a spec-tech*.md path?
  │   └→ Read it, parse scopes by [TYPE], build execution plan
  ├── User described scopes verbally?
  │   └→ Extract scope types, objectives, dependencies manually
  └── No structured input?
      └→ Ask: "What approved plan should I execute?
         Provide the path to a spec-tech*.md file, or
         describe the scopes you want me to execute."
```

Once input is resolved, proceed to Step 1: Read and parse the plan.

---

## Output Expectations

Strong execution runs:
- **Respect dependency order** — no scope starts before its dependencies
- **Use the right tool for each type** — worker for features, goals tool for optimization, scout for spikes
- **Handle failures gracefully** — one failed scope doesn't block the rest
- **Produce a clear final report** — what was done, what changed, what failed

Weak execution runs:
- **Run everything sequentially** when parallel is safe
- **Treat optimization scopes as plain worker tasks instead of using the goals tool** (loses the optimization loop advantage)
- **Ignore scope types** and treat everything as implementation
- **Block on minor failures** or reviewer feedback
