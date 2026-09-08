---
name: stelow-workflow-scope-executor
description: >
  [stelow] Reads an approved product plan with typed scopes (feature, optimization, spike, test-*)
  and routes each scope to its correct executor. Acts as the autonomous overnight
  "set and forget" orchestrator for approved plans.
  For test-* scopes, enforces hard blocks (critical-path tests, security gates).
  Part of stelow but can be used standalone.
metadata:
  frequency: weekly
  category: workflow
  context-cost: low
  author: calionauta
  author-url: https://github.com/calionauta
---

# Execution Executor

Autonomous plan execution orchestrator. Reads an approved plan from `docs/`, parses each scope by type, dispatches to the right executor, and consolidates results.

This skill is designed to run **after** the visual review gate approves the plan. It replaces manual step-by-step execution with a single autonomous orchestration pass.

---

## Input

The skill operates on the **approved plan document** — the artifact persisted at
`docs/{YYYY-MM-DD}/{slug}/plans/spec-tech_{v}.md` after the visual review gate passes.

Where `{slug}` is a short kebab-case identifier for the project (e.g. `login-system`,
`payment-refactor`) and `{v}` is an auto-incremented version number.

The plan must contain scopes with type annotations:
- `[TYPE] feature` — implement new functionality
- `[TYPE] optimization` — improve a measurable metric (must include `[METRIC]`)
- `[TYPE] spike` — research or prototype
- `[TYPE] test-unit` — unit tests with coverage/risk gates
- `[TYPE] test-integration` — integration tests with real dependencies
- `[TYPE] test-security` — SAST and security gates
- `[TYPE] test-behavior` — behavioral testing for agent workflows

If the plan has the optional **"Execution routing"** section (from stelow), use it directly. Otherwise, infer routing from `[TYPE]` tags.

**Standalone awareness:** when inside stelow, reads appetite from `.stelow/*/plans/spec-product*.md` and checks review_mode from `stelow.json#workflows[].config.review_mode`. When standalone, defaults to Core appetite + Product Spec + Interface + Scopes review mode. Scans current directory for `spec-tech*.md` files. The `[TYPE]` routing works identically in both modes — no stelow dependency for scope execution logic.

---

## Role

You are an **execution orchestrator** — a senior engineering lead running a shift-left review of an approved plan. Your job is NOT to redesign or question the plan (that already happened in earlier phases). Your job is to **execute every scope correctly**, in dependency order, using the right tool for each type.

You have access to the harness's tools and subagents. Use them.

---

## Workflow

### Step 1: Read and parse the plan

Read the approved plan file. Identify every scope and its type.

Example scope shape:
```
[SCOPE-1]
[TYPE] feature
[MAX_ITERATIONS] 5                     # optional, default: 3
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
| `feature` | *absent* → worker + **iteration loop** (see Step 3) |
| `feature` | `research` → **research loop** (override) |
| `optimization` | *absent* → goals tool (see `../stelow-workflow-orchestrator/references/cli-tools/goals.md`, Optimization Goals) |
| `optimization` | `worker` → **worker** (override) |
| `spike` | *absent* → scout + researcher |
| `spike` | `research` → **research loop** (override, rare) |
| `test-unit` | worker + coverage/risk gates |
| `test-integration` | worker + real dependencies |
| `test-security` | worker + SAST gates |
| `test-behavior` | worker + behavioral testing |

### Step 2c: Report the execution plan

Before executing, present a clear execution plan to the user with the resolved executor:

```
📋 Execution Plan for: {plan-name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Appetite: {Lean|Core|Complete} (human-set)
Appetite Fit: {fits|cuts_needed|reshape} (LLM-set)
Phase 1 (parallel):
  ⏩ [SCOPE-1] Login — feature → worker
  ⏩ [SCOPE-3] Vector DB eval — spike → scout + researcher
  ⏩ [SCOPE-4] Refactor payments — feature → subagent (override)

Phase 2 (after SCOPE-1):
  ⏩ [SCOPE-2] Search optimization — optimization → goals tool
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Human-in-loop check for Complete appetite:**

```bash
# Try precise path first, then fallback to glob. Cross-check with Workflow.config.appetite
# (canonical source via helper) so the warning matches the active workflow, not stale specs.
APPETITE=$(grep -oP '^appetite:\s*\K\S+' .stelow/*/*/plans/spec-product_*.md 2>/dev/null || echo "Core")
# shellcheck disable=SC1091
source "$(dirname "${BASH_SOURCE[0]:-$0}")/../../stelow-workflow-orchestrator/references/cli-tools/read-config.sh" 2>/dev/null || true
WF_APPETITE=$(stelow_read_appetite 2>/dev/null || true)
[ -n "$WF_APPETITE" ] && APPETITE="$WF_APPETITE"
if [ "$APPETITE" = "Complete" ]; then
  echo "⚠️ COMPREHENSIVE APPETITE: Human-in-loop mode may be needed for architectural changes."
  echo "Check the workflow's review_mode setting in stelow.json#workflows[].config.review_mode."
  echo "In Product Spec + Interface + Tech Review mode, each PR/fork-point requires human approval before merge."
```

Ask the user (skip this ask entirely in `Auto` mode — proceed autonomously;
it exists for gated modes and standalone runs, whose default review mode
is gated):
```
Shall I proceed with autonomous execution? I'll report back when all scopes are complete.
```

If the user says yes, proceed autonomously. If no, ask what they'd like to adjust.

### Step 2e: Initialize scope tracking in `stelow.json`

Before executing scopes, `wf.scopes[]` must be populated from the latest
`spec-tech.md`. Run the canonical subcommand (see
[`references/cli-tools/scope-init-fallback.md`](references/cli-tools/scope-init-fallback.md)
for the full contract) before Step 3:

```bash
scripts/stelow sync-scopes [--name <workflow>] [--json]
# inside bb: the plugin wraps the same operation
```

With `STELOW_STATEDIR` pointing at the workflow's state dir, no `--name` is
needed. The subcommand is idempotent (re-run on spec-tech v2+ re-syncs) and
fail-safe (missing input is an exit-0 no-op; existing state is never replaced
with an empty scope list).

**How the parser is reached:**

`scripts/stelow sync-scopes` is the single canonical parser for `[SCOPE-N]`
blocks. It returns scopes containing `id`, `type`, `name`, `blockedBy`,
`targetFiles`, and `maxIterations`, with every scope set to `status: 'pending'`.
All hosts shell out to it — there is no per-host parser and no compiled
artifact to install. Discovery is by convention:
`.stelow/{date}/{hash}/plans/spec-tech_*.md`, with the `wf.specTechFile`
version marker for idempotent skips.

This follows KISS + DRY + Convention over Configuration:
- **KISS:** One subcommand, zero host-specific triggers.
- **DRY:** Every host consumes the same parser; the skill holds no copy.
- **CoC:** `spec-tech_*.md` is found by convention at
  `.stelow/{date}/{hash}/plans/`; the date stamp comes from `wf.created` and the
  directory hash from `wf.dirHash`.

After synchronization has fired for a workflow, the LLM must still update
scope statuses manually as it executes (see Steps 3c/3e).

**Key:** All scopes start as `status: 'pending'`. Update each scope's status as execution progresses.

**Parse `[TARGET_FILES]` from spec-tech.md (optional convention):**

If a scope body in `spec-tech_{v}.md` includes a `[TARGET_FILES]` block:

```
[TARGET_FILES]
- src/auth/**
- src/middleware/auth.ts
- tests/auth/**
```

parse it into `target_files: string[]` on the corresponding `wf.scopes[i]` entry AND into the per-scope `scope-contract.json` (under `target_files`).

**Parse `[LOCK_TTL_SECONDS]` from spec-tech.md (optional convention):**

Same scope body may declare a lock TTL override:

```
[LOCK_TTL_SECONDS] 7200
[TARGET_FILES]
- src/migration/**
```

Parse the integer value into `wf.scopes[i].lock_ttl_seconds: number` (optional). Default is 1800 (30 min); see `references/cli-tools/file-locking.md#ttl-configuration` for range / clamping rules. At Step 3c, the orchestrator exports this to `$LOCK_TTL_SECONDS` for the acquire snippet.

Convention is **advisory** — no enforcement at the tracking layer. The file-reservation lock protocol (see `../stelow-workflow-orchestrator/references/cli-tools/file-locking.md` in `stelow-workflow-orchestrator`) uses these declared paths at scope-execution time. If undeclared, the post-execution `actual_files ∩ declared` diff in Step 8 still flags undeclared writes.

### Step 2d: Complete Human-in-loop execution mode

If appetite is `Complete`, **modify execution flow** for each scope:

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

### Step 3: Execute feature scopes (acceptance-based delegation)

Delegate each feature scope with an acceptance contract (criteria + verify
commands + stop rules, `MAX_ITERATIONS` cap). The child self-corrects on
feedback (`feedback_log`); on plateau, retry with a different approach;
ESCALATE to a human after max iterations. Persist state to
`iteration-state-{SCOPE-ID}.md` as you go — resume/rehydrate from disk after
compaction, never from memory. Full loop, evidence snippets, Record template
and planned/discovered task tracking: `references/step-3-feature.md`, then
`references/records-and-tasks.md`.

### Record + Tasks (claim-proof evidence)

Every completed scope carries a `## Record` section (files touched, commands
run, verification checklist, limitations) plus planned/discovered `tasks[]`.
Full template, field semantics, seed/append guards, and hill-chart rules:
`references/records-and-tasks.md`.

### Steps 4–8: other executors, compliance, report

| Step | Route |
|------|-------|
| 4 — optimization | acceptance contract + benchmark verify |
| 5 — spike | delegate recon + research, consolidate recommendation |
| 6 — dependencies | parallel where independent, wait where blocked |
| 7 — compliance | coverage, DoD, coding standards, APPROVED/CAVEATS/REJECTED |
| 8 — report | 4-class overlap report + `execution-report.md` |

Full instructions: `references/other-executors.md` (Steps 4–7),
`references/close-out-report.md` (Step 8).

**Output:** this skill produces per-scope `iteration-state-{SCOPE-ID}.md`
(with `## Record`), an `execution-report.md` with the 4-class overlap
report, and updated `wf.scopes[]` in `stelow.json` — details in the files
above.

## Parallel Execution Rules

- **Independent scopes can run in parallel.** Use subagent's `async: true` + `concurrency` to run multiple scopes simultaneously.
- **Dependent scopes must wait.** If SCOPE-2 depends on SCOPE-1, do not start SCOPE-2 until SCOPE-1 is complete and reviewed.
- **File overlap is detected post-execution** via `git diff --name-only` capture (see Step 3e "Persist state" — `actual_files` field). This is **audit, not prevention**: stelow surfaces overlap AFTER both scopes finish for human decision. No pre-execution guard; no runtime working-directory isolation. Users who need prevention configure their harness directly.
- **Reasonable concurrency:** 2-3 parallel scopes maximum unless the plan explicitly allows more. Running too many in parallel increases the risk of conflicts.

---

## Error Handling

- **If a worker fails** (crash, stuck, timeout): note it, log the error, and move to the next scope. Do not block the entire execution on one failure.
- **If an optimization goal fails:** check the log, fix if trivial, otherwise skip and note it.
- **If a reviewer finds blocking issues:** flag them and feed back into the iteration loop (see Step 3). The next iteration will receive the review findings as feedback. Only escalate if max_iterations is reached.
- **If a spike is inconclusive:** document what was learned and recommend next steps.

---

## Invocation modes

Full autonomous (default) or scope-by-scope; standalone input detection, tool
interaction, environment adaptation: `references/invocation.md`. Visual review
gate doc: `../stelow-workflow-orchestrator/references/cli-tools/visual_review.md`.

## Entry (mode detection)

When this skill loads, check for the stelow workflow marker:

```bash
if [ -n "$STELOW_WORKFLOW" ] && [ -n "$STELOW_STATE" ]; then
  echo "stelow: workflow mode (state=$STELOW_STATE)"
else
  echo "stelow: standalone mode (no STELOW_WORKFLOW marker)"
fi
```

In **standalone mode** (no marker), run the existing skill body unchanged.
In **workflow mode**, skip to `### Workflow slice` and emit a complete
`## Hand-off (workflow mode)` block at the end. See
`../stelow-workflow-entry/SKILL.md` for the full marker protocol.

## Hand-off (workflow mode)

```
stage          : scope
description    : Scope adjustment. Add/remove from IN/OUT after gate approval.
status         : <done|partial|blocked>
artifacts      : <paths created or modified>
next-candidate : interface
gate           : none
rework-on      : gate
```

Workflow mode: emit the above Hand-off block verbatim, then stop. The
router skill consumes the next-candidate field and calls
`scripts/stelow advance <next-candidate>` to move state forward.

### Workflow slice

Workflow mode for the **scope** stage. Standalone behavior lives in
the rest of this file (unchanged). Summary:

> Scope adjustment. Add/remove from IN/OUT after gate approval.

Primary actions (per stages.yaml): `read, write`. Run only the actions that
produce the artifacts promised in `## Hand-off`; skip anything that does
not advance the workflow.

