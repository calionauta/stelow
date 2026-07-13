---
name: stelow-product-scope-executor
description: >
  [stelow] Reads an approved product plan with typed scopes (feature, optimization, spike, test-*)
  and routes each scope to its correct executor. Acts as the autonomous overnight
  "set and forget" orchestrator — the pi equivalent of /goal for approved plans.
  For test-* scopes, enforces hard blocks (critical-path tests, security gates).
  Part of stelow but can be used standalone.
metadata:
  frequency: weekly
  category: product
  context-cost: low
  author: calionauta
  author-url: https://github.com/calionauta
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
- `[TYPE] test-unit` — unit tests with coverage/risk gates
- `[TYPE] test-integration` — integration tests with real dependencies
- `[TYPE] test-security` — SAST and security gates
- `[TYPE] test-behavior` — behavioral testing for agent workflows

If the plan has the optional **"Execution routing"** section (from stelow), use it directly. Otherwise, infer routing from `[TYPE]` tags.

**Standalone awareness:** when inside stelow, reads appetite from `.stelow/*/plans/spec-product*.md` and checks review_mode from `stelow.json#workflows[].config.review_mode` (with fallback to `.stelow/*/index.json#config` for pre-v0.50.0 workflows). When standalone, defaults to Core appetite + Product Spec + Interface + Scopes review mode. Scans current directory for `spec-tech*.md` files. The `[TYPE]` routing works identically in both modes — no stelow dependency for scope execution logic.

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
| `optimization` | *absent* → goals tool (see `references/cli-tools/goals.md`, Optimization Goals) |
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
source "$(dirname "${BASH_SOURCE[0]:-$0}")/../../stelow-product-orchestrator/references/cli-tools/read-config.sh" 2>/dev/null || true
WF_APPETITE=$(stelow_read_appetite 2>/dev/null || true)
[ -n "$WF_APPETITE" ] && APPETITE="$WF_APPETITE"
if [ "$APPETITE" = "Complete" ]; then
  echo "⚠️ COMPREHENSIVE APPETITE: Human-in-loop mode may be needed for architectural changes."
  echo "Check the workflow's review_mode setting in stelow.json#workflows[].config.review_mode (or .stelow/{date}/{dir}/index.json for legacy workflows)."
  echo "In Product Spec + Interface + Tech Review mode, each PR/fork-point requires human approval before merge."
```

Ask the user:
```
Shall I proceed with autonomous execution? I'll report back when all scopes are complete.
```

If the user says yes, proceed autonomously. If no, ask what they'd like to adjust.

### Step 2e: Initialize scope tracking in `stelow.json`

Before executing scopes, the **extension auto-syncs** the scope list from `spec-tech.md`
into `stelow.json` by convention — the LLM does NOT need to run a bash snippet for this.

**How it works:** When the extension's `writeTracking()` sees a workflow in Execution phase
with empty `scopes[]`, it automatically:
1. Finds the latest `spec-tech_*.md` in `.stelow/{date}/{hash}/plans/`
2. Parses `[SCOPE-N]` blocks for `id`, `type`, `name`, `blockedBy`, `targetFiles`
3. Populates `wf.scopes[]` with all scopes set to `status: 'pending'`
4. Persists to `stelow.json`

This follows KISS + DRY + Convention over Configuration:
- **KISS:** Zero LLM effort. No bash to remember or skip.
- **DRY:** One centralized TypeScript function replaces ~20 lines of bash SKILL.md
- **CoC:** spec-tech.md found by convention at `.stelow/{date}/{hash}/plans/spec-tech_*.md`

The auto-sync only fires **once** per workflow (when scopes are empty). After that,
the LLM must still update scope statuses manually as it executes (see Steps 3c/3e).

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

Convention is **advisory** — no enforcement at the tracking layer. The file-reservation lock protocol (see `references/cli-tools/file-locking.md` in `stelow-product-orchestrator`) uses these declared paths at scope-execution time. If undeclared, the post-execution `actual_files ∩ declared` diff in Step 8 still flags undeclared writes.

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

For each scope with `[TYPE] feature`:

---

#### 3a. Strategy: Acceptance Contract

**Core pattern:** Delegate with an acceptance contract. The child agent implements, self-corrects against the contract, and returns a final result. The parent evaluates the final result — it does NOT control per-iteration loops.

```
PARENT                          CHILD
──────                          ─────
1. Build acceptance contract
2. Delegate with contract ──────→ 3. Implement
                                4. Self-correct against contract
                                5. Return acceptance report
6. Evaluate final result ←──────
7. Quality checks + review
8. DONE or ESCALATED
```

**Why this works across harnesses:** The acceptance contract is a data structure, not a specific API. Every harness can express: "here are the criteria, here are the verify commands, here's how many self-correction turns you get."

---

#### 3b. Build the acceptance contract

From the scope definition in spec-tech.md, extract:

| Field | Source | Description |
|-------|--------|-------------|
| `criteria` | Acceptance Criteria (ACs) | What must be true for the scope to be done |
| `verify` | Verify commands from plan | Commands that prove criteria are met |
| `evidence` | Inferred from scope type | What the child should report (files changed, tests added, etc.) |
| `stopRules` | Inferred from scope type | Constraints the child must not violate |
| `maxSelfCorrectionTurns` | `[MAX_ITERATIONS]` or default 3 | How many times the child can self-correct |

**Criterion construction:**
- Each AC from spec-tech.md becomes one criterion
- Each DoD item becomes one criterion
- Mark critical criteria as `severity: required`
- Keep criteria concrete and verifiable ("Login returns 200 on valid credentials", not "Login works")

**Verify commands:**
- From spec-tech.md verify section
- Always include: test runner, linter, type checker
- Add scope-specific commands (e.g., benchmark for optimization)

**StopRules (inferred by scope type):**
| Scope Type | StopRules |
|------------|-----------|
| feature | Do not change public API signatures. Do not edit files outside scope. |
| optimization | Do not break existing tests. Do not change public API. |
| test-* | Do not modify production code. Only add test files. |

---

#### 3c. Delegate with contract

**Record scope-start SHA (for post-execution overlap detection):**
```bash
SCOPE_START_SHA=$(git rev-parse HEAD)
```
Record this SHA in `iteration-state-{SCOPE-ID}.md` so the post-execution `git diff --name-only` (Step 3e) can compute the scope's exact file footprint, not a heuristic.

**Acquire file-reservation locks (prevention layer):**

If the scope declared `[TARGET_FILES]` (see Step 2e) AND the orchestrator plans parallel dispatch, acquire locks via the protocol in `references/cli-tools/file-locking.md`:

```bash
# Resolve TTL from `[LOCK_TTL_SECONDS]` block if present; default 1800.
# Validated by file-locking.md; here we just export to env for the acquire snippet.
if [ -n "${LOCK_TTL_BLOCK:-}" ]; then
  export LOCK_TTL_SECONDS="$LOCK_TTL_BLOCK"   # bash escapes; the acquire snippet re-validates
else
  unset LOCK_TTL_SECONDS
fi

# Check existing locks for any of this scope's target_files
LOCK_DIR=".stelow/${DATE}/${DIR}/locks"
mkdir -p "$LOCK_DIR"
CONFLICTS=()
for f in ${TARGET_FILES[@]}; do
  LOCK="$LOCK_DIR/$(printf '%.12s' "$(printf '%s' "$f" | sha1sum | cut -d' ' -f1)").lock"
  if [ -f "$LOCK" ]; then
    HOLDER=$(jq -r '.scope_id' "$LOCK" 2>/dev/null)
    EXPIRES=$(jq -r '.expires_at' "$LOCK" 2>/dev/null)
    if [ "$HOLDER" != "$SCOPE_ID" ] && [ "$(date -u -d "$EXPIRES" +%s)" -gt "$(date -u +%s)" ]; then
      CONFLICTS+=("$f held by $HOLDER")
    fi
  fi
done
if [ ${#CONFLICTS[@]} -gt 0 ]; then
  echo "⚠️ Lock conflicts — aborting parallel dispatch:" >&2
  printf '  • %s\n' "${CONFLICTS[@]}" >&2
  echo "Either: (a) sequential re-dispatch, or (b) wait for lock expiry." >&2
  # Orchestrator decides next step (sequential re-run or wait)
fi

# Acquire locks (skip files held by stale/expired locks — see file-locking.md)
for f in ${TARGET_FILES[@]}; do
  # ... full acquire snippet in file-locking.md ...
done
```

The lock protocol is **opt-in for the agent**: skip this step entirely if the scope has no `target_files` declared OR sequential dispatch is in use. See `file-locking.md` for full bash, TTL semantics, and stale-lock stealing.

**Mark scope as in-progress:**
```bash
node -e "
const fs = require('fs');
const tracking = JSON.parse(fs.readFileSync('stelow.json', 'utf8'));
const wf = tracking.workflows.find(w => w.status === 'in-progress');
if (wf?.scopes) {
  const scope = wf.scopes.find(s => s.id === '{SCOPE-ID}');
  if (scope) {
    scope.status = 'in-progress';
    scope.start_sha = process.env.SCOPE_START_SHA || '';
  }
  wf.updated = new Date().toISOString();
  fs.writeFileSync('stelow.json', JSON.stringify(tracking, null, 2));
}
"
```

**Read existing iteration state** (for crash recovery):
- State file: `docs/{YYYY-MM-DD}/{slug}/iteration-state-{SCOPE-ID}.md`
- If exists → rehydrate context. If not → fresh start.

**Delegate to child agent** with the acceptance contract. The task description must include:
1. The scope objective and DoD from spec-tech.md
2. The acceptance criteria (concrete, verifiable)
3. The verify commands
4. The stop rules
5. If resuming from a prior iteration: the feedback log of what failed

**Harness-specific delegation patterns:**

The delegation mechanism varies by harness. The contract data stays the same; only the API changes.

| Harness | Delegation pattern | Self-correction mechanism |
|---------|-------------------|--------------------------|
| **pi** (pi-subagents) | `subagent({ agent, task, acceptance })` | `acceptance.maxFinalizationTurns` — runtime reopens child session for self-correction |
| **Pi (with pi-subagents)** | `subagent({ agent, task, context: "fresh", acceptance })` | Child self-validates; parent receives structured result |
| **Pi (built-in subagent)** | `subagent({ agent, task })` | Always-isolated child; parent reads checkpoint after child returns |
| **Universal fallback** | Execute directly in current session, save outputs to files | Manual iteration in parent context |

**Example: pi-subagents (acceptance-native)**

When the harness supports acceptance contracts natively, delegate once and let the runtime handle self-correction. The worker runs **fresh** with **explicit reads** — the acceptance contract IS the contract, orchestrator deliberation history is noise.

```typescript
subagent({
  agent: "worker",
  task: `Implement scope {SCOPE-ID}: {scope-name}

Objective: {dod}
Acceptance Criteria:
{acs.map((ac, i) => `- AC-${i+1}: ${ac}`).join('\n')}

Verify commands: {verifyCommands.join(', ')}
Stop rules: {stopRules.join(', ')}`,
  reads: [
    ".stelow/{date}/{dir}/plans/spec-tech_{v}.md",
    ".stelow/{date}/{dir}/scopes/{SCOPE-ID}.json",
    // For UI/visual scopes, also include the user's chosen interface
    ".stelow/{date}/{dir}/interfaces/selected-interface.md"  // include only if scope is UI-related
  ],
  context: "fresh",
  acceptance: {
    criteria: acs.map((ac, i) => ({
      id: `AC-${i+1}`,
      must: ac,
      severity: "required"
    })),
    verify: verifyCommands.map((cmd, i) => ({
      id: `V-${i+1}`,
      command: cmd
    })),
    evidence: ["changed-files", "tests-added", "commands-run"],
    stopRules: stopRules,
    maxFinalizationTurns: maxIterations  // child self-corrects N times
  }
})
```

The runtime automatically:
1. Sends the contract to the child
2. Child implements
3. Runtime reopens child session: "Check each criterion. Fix omissions."
4. Child self-corrects in the SAME context (no context loss)
5. Repeats up to `maxFinalizationTurns`
6. Returns final acceptance report

Parent evaluates the acceptance report — no manual iteration loop needed.

**Example: other CLIs (parent-controlled loop)**

When the harness does NOT support acceptance natively, the parent controls the iteration loop. Each iteration is a **fresh** subagent with **explicit reads** — the child does not remember prior attempts, so feedback must be in the task string.

```typescript
// Iteration 1
subagent({
  agent: "worker",
  task: `Implement scope {SCOPE-ID}: {scope-name}

Objective: {dod}
Acceptance Criteria:
{acs.map((ac, i) => `- AC-${i+1}: ${ac}`).join('\n')}

Verify commands: {verifyCommands.join(', ')}`,
  reads: [
    ".stelow/{date}/{dir}/plans/spec-tech_{v}.md",
    ".stelow/{date}/{dir}/scopes/{SCOPE-ID}.json"
  ],
  context: "fresh"
})
// → run verify commands → evaluate
// If failed: collect feedback

// Iteration 2 (if needed)
subagent({
  agent: "worker",
  task: `Implement scope {SCOPE-ID}: {scope-name}

Objective: {dod}
Acceptance Criteria:
{acs.map((ac, i) => `- AC-${i+1}: ${ac}`).join('\n')}

Previous attempt failed:
{feedback}
Try a different approach — do not repeat the same fix.`,
  reads: [
    ".stelow/{date}/{dir}/plans/spec-tech_{v}.md",
    ".stelow/{date}/{dir}/scopes/{SCOPE-ID}.json"
  ],
  context: "fresh"
})
// → run verify commands → evaluate
// Repeat up to max_iterations
```

Key difference: each iteration is a **new fresh context** (child doesn't inherit parent history, doesn't remember prior attempts). The feedback + acceptance contract must be explicit in the task string + `reads`.

---

#### 3d. Parent evaluation (after child returns)

After the child returns its final result (acceptance report or iteration output), the parent evaluates:

1. **Acceptance criteria:** Read each AC from spec-tech.md. Verify with concrete evidence from the child's output.
2. **Verify commands:** Run them (if the child didn't already). Check exit codes.
3. **Quality checks:**
   - **UI/visual scope:** `stelow-product-ux-critique` — accessibility (WCAG POUR), Nielsen heuristics, visual hierarchy, cognitive load.
   - **Codebase-only scope:** `stelow-product-codebase-critique` — architecture, data flow, API contracts, performance.
   - **Both or unclear:** Run both.
4. **Parallel code review:**
   - Correctness reviewer (regressions, edge cases)
   - Simplicity reviewer (load `stelow-product-coding-standards` — KISS, DRY, LoB/SoC, Fail Fast, YAGNI)

**Evaluation outcome:**
| Result | Action |
|--------|--------|
| All pass (criteria + verify + review + quality) | ✅ Scope DONE |
| Child returned with fixes needed | 🔄 Re-delegate with feedback (parent-controlled loop only) |
| max_iterations exhausted | ⚠️ ESCALATE to human with full report |

**Plateau detection** (parent-controlled loop only):
- If the same error appears in 2 consecutive iterations → force different approach in feedback
- If plateau persists after 3 iterations → escalate (don't waste compute)

---

#### 3e. Persist state, capture scope footprint, and update tracking

**Persist iteration state** (survives compaction/crash):
```bash
# Write to docs/{YYYY-MM-DD}/{slug}/iteration-state-{SCOPE-ID}.md
# Include: scope, iteration, status, errors, files changed, feedback
```

**Capture observed file footprint (post-hoc overlap detection)**

After the scope finishes (acceptance verified or final iteration reached), capture the actual files changed via `git diff --name-only`. This is the source of truth for overlap detection — observed reality, not a predicted `[TARGET_FILES]` declaration.

```bash
# Capture diff between the SHA recorded at scope-start and HEAD
SCOPE_START_SHA={capture-before-scope-began}   # set in Step 3c "Mark scope as in-progress"
ACTUAL_FILES=$(git diff --name-only "$SCOPE_START_SHA"..HEAD 2>/dev/null \
  | grep -v '^docs/' \
  | grep -v '^\.stelow/' \
  || true)
```

Why this matters: parallel scope execution is opt-in. If two scopes were dispatched concurrently and they touched the same files, the post-execution diff will reveal the conflict — not a predicted heuristic, but observed file changes. This replaces the LLM-applied "file-overlap guard" with deterministic, ground-truth detection.

**Update scope tracking** (status + iteration + observed footprint):
```bash
node -e "
const fs = require('fs');
const tracking = JSON.parse(fs.readFileSync('stelow.json', 'utf8'));
const wf = tracking.workflows.find(w => w.status === 'in-progress');
if (wf?.scopes) {
  const scope = wf.scopes.find(s => s.id === '{SCOPE-ID}');
  if (scope) {
    scope.status = 'completed';  // or 'escalated' on failure
    scope.iteration = {M};       // final iteration count
    scope.actual_files = {ACTUAL_FILES.split('\n').filter(Boolean)};
  }
  wf.updated = new Date().toISOString();
  fs.writeFileSync('stelow.json', JSON.stringify(tracking, null, 2));
}
"
```

**Release file-reservation locks:**

If locks were acquired in Step 3c, release them now. Lock release uses the same atomic-create pattern inverted (just `rm -f`). Stale locks (TTL expired) auto-recover on next acquire. See `references/cli-tools/file-locking.md`.

**Report per scope:**
```
✅ [SCOPE-1] Login — DONE (acceptance verified, 3 files, 2 reviews passed)
⚠️ [SCOPE-2] Dashboard — ESCALATED (3 iterations, last error: e2e test timeout)
```

> **Why file persistence?** LLM context can be compacted (pi's `/compact`, `/clear`, or tool-level resets). The state file ensures the iteration loop resumes correctly after any context loss. This pattern is CLI-agnostic — any agent with file system access can read/write the same format. The `actual_files` field enables the post-execution overlap check (Step 8).

#### 3e-bis. Record convention (claim-proof evidence before close)

**Convention (v1 — advisory, no enforcement):** every completed scope must have a `## Record` section in its iteration-state file (`docs/{YYYY-MM-DD}/{slug}/iteration-state-{SCOPE-ID}.md`). The Record is the **claim-proof artifact** that proves the scope did what it claimed, under the conditions that existed, with the limitations and non-claims spelled out. Without it, the ✅ is unearned.

Template (copy into `iteration-state-{SCOPE-ID}.md` on scope start, fill on close):

```markdown
## Record

### Files touched (auto from git diff)
<!-- Filled by executor at Step 3e from `git diff $start_sha..HEAD`. -->
- path/one.ts
- path/two.ts

### Commands run (manual, log every verify command)
<!-- Filled by executor; every verify/test/lint command goes here. -->
- `npm test` → exit 0
- `npm run typecheck` → exit 0
- `npm run lint` → exit 0 (3 warnings, non-blocking)

### Verification checklist
<!-- Filled by executor. unchecked items = blocker. -->
- [ ] acceptance criteria met (cite AC text from spec-tech.md)
- [ ] no scope overlap introduced (Step 8 report class a/b clean)
- [ ] no new TODO/FIXME introduced without entry in spec-tech.md
- [ ] suggested commit: `feat: <conventional> (<scope-name>)`

### Limitations / non-claims
<!-- What this Record does NOT prove. Honest scope. -->
- Did not test under load (out of DoD).
- Did not verify backward-compat with the v0.4 API (broken in v0.5+ by design).
```

**Field semantics (matches Evidence Ladder, weakest-true-claim discipline):**
- `Files touched` — ground truth, NOT a re-statement of `target_files`. The diff between `start_sha` and HEAD is authoritative; never hand-edit this list.
- `Commands run` — agent discipline. Every verify command executed MUST appear with its exit code. Skipped commands go in `Limitations / non-claims`, not here.
- `Verification checklist` — minimum proof level. unchecked items block close.
- `Limitations / non-claims` — anti-overclaim. If the scope "works", but you didn't test the failure mode, say so here. Future agents (and humans) need to know what's NOT proven.

**How to fill the bash placeholders (`{M}`, `{COMMAND_COUNT_FROM_BODY}`, `{true_or_false}`, `{conventional-commit-line}`):**

- `{M}` — final iteration count (the `iteration` variable Step 3 tracked). Already familiar from previous 3e bash above.
- `{COMMAND_COUNT_FROM_BODY}` — count the `- \`command\`` entries inside the `### Commands run` section. If you ran 4 verify commands, this is `4`. If you skipped verifications, document the skips under `Limitations / non-claims` AND set `commands_count: 0` honestly.
- `{true_or_false}` — literally `true` or `false` (no quotes around the boolean at the JSON level). Set `true` ONLY when every `- [ ]` in `### Verification checklist` is `- [x]`. Set `false` if ANY checkbox is unchecked AND you closed anyway (rare — usually means you should escalate instead of close).
- `{conventional-commit-line}` — a Conventional Commits line like `feat(auth): add SQLite migration`. The Record body has a dedicated line for this in the Verification checklist.

**Why markdown body, not YAML/JSON:** LLMs parse markdown natively with zero escape risk; the `stelow.json` mirror fields (`record.completed_at`, `record.files_count`, `record.commands_count`, `record.verified`, `record.suggested_commit` — all snake_case to match the rest of the schema) are the machine-checkable subset for execution-critique. Body is human + LLM readable; mirror is programmatic.

**Wire into `stelow.json` (machine-checkable subset):**

```bash
node -e "
const fs = require('fs');
const tracking = JSON.parse(fs.readFileSync('stelow.json', 'utf8'));
const wf = tracking.workflows.find(w => w.status === 'in-progress');
if (wf?.scopes) {
  const scope = wf.scopes.find(s => s.id === '{SCOPE-ID}');
  if (scope) {
    scope.status = 'completed';
    scope.iteration = {M};
    scope.actual_files = {ACTUAL_FILES.split('\n').filter(Boolean)};
    scope.record = {
      completed_at: new Date().toISOString(),
      files_count: scope.actual_files.length,
      commands_count: {COMMAND_COUNT_FROM_BODY},
      verified: {true_or_false},  // set true ONLY when ALL Verification checklist items are [x]
      suggested_commit: '{conventional-commit-line}',
    };
  }
  wf.updated = new Date().toISOString();
  fs.writeFileSync('stelow.json', JSON.stringify(tracking, null, 2));
}
"
```

**Enforcement:**
- By default, `record` is an advisory convention. `stelow-product-execution-critique`
  Criterion 6 flags scopes with `status: 'completed'` AND `record.verified !== true`.
- `STELOW_VALIDATE=1` enables runtime validation in `writeTracking()`. The
  `schema-record.ts` validators check every scope's `record` and `tasks`
  before persisting the tracking file.
- Pre-commit hook at `scripts/pre-commit-record.sh` blocks commits with
  unverified completed scopes.

#### 3e-ter. Task tracking — Shape Up hill chart inside a scope

**Convention:** each scope carries a `tasks[]` checklist on `wf.scopes[i].tasks`. Tasks are NOT separate execution units — they're a visible checklist that lets the executor and the human see what work the scope is doing right now, what got discovered mid-execution, and where the scope actually was when it closed. This is the Shape Up hill chart collapsed into a single scope.

**Two sources of tasks:**

| Source | Origin | When to use |
|---|---|---|
| `planned` | Parsed from the `\| # \| Task \| ... \|` table in spec-tech.md (see `skills/stelow-product-tech-planning/references/scopes-and-sequencing.md#Scope Detail Template`). | Tasks defined at planning time. |
| `discovered` | Appended by the executor (LLM child) during execution when reality reveals new work — a test flake, a missing index on a slow query, a refactor needed for the ACs. | Always requires a `note:` explaining the trigger. |

**Seeding planned tasks (scope start, in Step 3c):**

After parsing the scope body for the Tasks table, push each into `scope.tasks` with
`status: 'pending'`, `source: 'planned'`. **Seed + validate in one pass** — no
separate guard step needed.

```bash
node -e "
const fs = require('fs');
const VALID_SOURCES = new Set(['planned', 'discovered']);
const VALID_STATUSES = new Set(['pending', 'done', 'skipped']);

const tracking = JSON.parse(fs.readFileSync('stelow.json', 'utf8'));
const wf = tracking.workflows.find(w => w.status === 'in-progress');
if (wf?.scopes) {
  const scope = wf.scopes.find(s => s.id === '{SCOPE-ID}');
  if (scope) {
    scope.status = 'in-progress';
    scope.start_sha = process.env.SCOPE_START_SHA || '';
    // Seed planned tasks from spec-tech.md — executor parses the body table and emits this list.
    const tasks = {TASKS_JSON_FROM_PARSED_TABLE};   // e.g. [{id:'3.1', name:'SQLite migration', source:'planned', status:'pending', risk:2}, ...]

    // Re-sync guard: validate tasks exist and have correct shape.
    // FAIL: empty/malformed table (parse failed).
    // FAIL: invalid source or status (typo, wrong field name).
    // WARN: discovered task without note.
    if (!Array.isArray(tasks) || tasks.length === 0) {
      console.error('[Seed guard] SCOPE-{SCOPE-ID}: tasks empty or not an array. spec-tech.md table may be malformed.');
      process.exit(1);
    }
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      if (!t.id || !t.name) {
        console.error('[Seed guard] SCOPE-{SCOPE-ID}: task[' + i + '] missing id or name');
        process.exit(1);
      }
      if (!VALID_SOURCES.has(t.source)) {
        console.error('[Seed guard] SCOPE-{SCOPE-ID}: task[' + i + '] invalid source: ' + t.source + ' (expected planned|discovered)');
        process.exit(1);
      }
      if (!VALID_STATUSES.has(t.status)) {
        console.error('[Seed guard] SCOPE-{SCOPE-ID}: task[' + i + '] invalid status: ' + t.status + ' (expected pending|done|skipped)');
        process.exit(1);
      }
      if (t.source === 'discovered' && !t.note) {
        console.warn('[Seed guard] SCOPE-{SCOPE-ID}: task[' + i + '] discovered but no note. Add note explaining trigger.');
      }
    }
    scope.tasks = tasks;
  }
  wf.updated = new Date().toISOString();
  fs.writeFileSync('stelow.json', JSON.stringify(tracking, null, 2));
  console.log('[Seed guard] SCOPE-{SCOPE-ID}: ' + (scope?.tasks?.length ?? 0) + ' tasks seeded OK.');
}
"
```

**Re-sync guard rationale:** Instead of a separate `node -e` that re-reads the file
(post-seed verification), validation runs inline during the seed write. Same
pass, same data, same guarantees. If the guard fails, inspect the spec-tech.md
Tasks table and fix the parsing before proceeding. Do NOT start execution
without seeded tasks — every task not discovered will be invisible and uncheckable.

**Appending a discovered task (mid-execution, in iteration feedback):**

When the child LLM discovers new work, append a task with `source: 'discovered'` and a non-empty `note:`.

```bash
node -e "
const fs = require('fs');
const tracking = JSON.parse(fs.readFileSync('stelow.json', 'utf8'));
const wf = tracking.workflows.find(w => w.status === 'in-progress');
if (wf?.scopes) {
  const scope = wf.scopes.find(s => s.id === '{SCOPE-ID}');
  if (scope) {
    if (!scope.tasks) scope.tasks = [];
    // {DISCOVERED_TASK_JSON} — emit e.g. {id:'3.7', name:'Index on users.email', source:'discovered', status:'pending', discovered_in_iter:3, note:'P95 query time 380ms without index; AC requires 50ms'}
    const task = {DISCOVERED_TASK_JSON};
    // Validate discovered task has a note (anti-rationalization)
    if (!task.note) {
      console.error('[Append guard] SCOPE-{SCOPE-ID}: discovered task missing note. Explain what triggered this task.');
      process.exit(1);
    }
    if (task.source !== 'discovered') {
      console.error('[Append guard] SCOPE-{SCOPE-ID}: appended task must have source:\'discovered\', got ' + task.source);
      process.exit(1);
    }
    scope.tasks.push(task);
    scope.discovered_tasks_count = (scope.discovered_tasks_count || 0) + 1;
  }
  wf.updated = new Date().toISOString();
  fs.writeFileSync('stelow.json', JSON.stringify(tracking, null, 2));
}
"
```

**Marking tasks done / skipped (during execution):**

```bash
node -e "
const fs = require('fs');
const tracking = JSON.parse(fs.readFileSync('stelow.json', 'utf8'));
const wf = tracking.workflows.find(w => w.status === 'in-progress');
if (wf?.scopes) {
  const scope = wf.scopes.find(s => s.id === '{SCOPE-ID}');
  if (scope?.tasks) {
    const t = scope.tasks.find(t => t.id === '{TASK-ID}');
    if (t) t.status = '{done_or_skipped}';
  }
  fs.writeFileSync('stelow.json', JSON.stringify(tracking, null, 2));
}
"
```

**Render tasks checklist into `iteration-state-{SCOPE-ID}.md`:**

The SKILL-rendered checklist (rendered into the markdown body so the executor + human can see state at a glance):

```
## Tasks

### Planned ({PLANNED_TOTAL}, {PLANNED_DONE} done)
- [x] 3.1 SQLite migration (LOW, db)
- [x] 3.2 CRUD commands (MED, api)
- [ ] 3.3 Integration test (MED, test)

### Discovered ({DISCOVERED_TOTAL}, {DISCOVERED_DONE} done)
- [x] 3.4 Fix race in DB init (iter 2 — discovered when migrate crashed twice)
- [ ] 3.5 Index on users.email (iter 3 — slow query observed)
```

**Rule of thumb (Shape Up style):** if a discovered task grows large enough to be its own delivery unit, **escalate and split into a new scope** instead of bloating the current scope. The hill chart's job is to make scope size honest, not to encourage scope creep in disguise.

**Why runtime tracking, not just markdown:**

The TS `ScopeTask` interface (`extensions/stelow/types.ts`) plus `scope.tasks` array on `wf.scopes[i]` lets `stelow-product-execution-critique` report:

- "Scope 3 closed with 5 of 6 planned tasks done and 1 skipped + 2 discovered (both done). Work was real."
- "Scope 7 closed with 1 task in `tasks` and the body was 80% unwritten." (catches scope-vs-task confusion early)

This is the machine-checkable proof that the scope was actually executed, not just declared. Combined with `Record Evidence` (Criterion 6) and `Tasks Tracking` (Criterion 11), the audit cycle ensures scope delivery is verified, not just claimed.

### Step 4: Execute optimization scopes (optimization → goals tool)

For each scope with `[TYPE] optimization`:

**Mark scope as in-progress:** (same bash pattern as Step 3 — update scope status to `'in-progress'`)

1. **Create an optimization goal** using the goals tool (see `references/cli-tools/goals.md` → Optimization Goals). The goals reference documents acceptance patterns, benchmark verify commands, and iteration loops.

2. **Set a stopping condition:**
   - If metric target is defined in the plan: stop when target is met
   - If no target: run for a reasonable number of iterations (5-10) or until improvements plateau

3. **When optimization completes**, run parallel code review (see `references/cli-tools/subagents.md`)
4. **DoD verification** (see Step 7)
5. **Update scope tracking** — set scope status to `'completed'` (or `'escalated'` on failure) in `stelow.json` (same bash pattern as Step 3)

### Step 5: Execute spike scopes (spike → scout + researcher)

For each scope with `[TYPE] spike`:

**Mark scope as in-progress:** (same bash pattern as Step 3 — update scope status to `'in-progress'`)

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
3. **Principles:** read `stelow-product-coding-standards` (skill)
   and check if principles were followed in the generated code
   - If violations were detected by parallel-review: were they fixed?
4. **Verification result:** APPROVED | CAVEATS | REJECTED

### Step 8: Report results

After all scopes are executed and compliance verified, compute **post-execution file overlap** from the captured `actual_files` arrays and produce a consolidated report:

```bash
# Compute pairwise file overlap + declared vs actual diff across completed scopes
node -e "
const fs = require('fs');
const tracking = JSON.parse(fs.readFileSync('stelow.json', 'utf8'));
const wf = tracking.workflows.find(w => w.status === 'in-progress');
const completed = (wf?.scopes ?? []).filter(s => s.status === 'completed' && Array.isArray(s.actual_files));

// (a) declared ∩ actual — undeclared writes (scope touched files outside its contract)
const undeclared = completed.map(s => ({
  id: s.id,
  declared: s.target_files ?? [],
  actual: s.actual_files,
  undeclared_writes: s.actual_files.filter(f => {
    // Use the SSOT matcher exported by the package. Consumers must have
    // stelow installed (it's a peer dep), so the build output is available
    // under the package's name. If the `require()` fails (missing package,
    // stale build), fall back silently — the 4-class report degrades to
    // exact path comparison only.
    const declared = s.target_files ?? [];
    try {
      const { matchesDeclaredGlob } = require('@calionauta/stelow/build/extensions/stelow/scope');
      return !declared.some(g => matchesDeclaredGlob(f, g));
    } catch {
      // Fallback: exact path only (no wildcards, no braces).
      return !declared.includes(f);
    }
  })
})).filter(s => s.undeclared_writes.length > 0);

// (b) pairwise actual ∩ actual — real overlap between parallel scopes
const overlaps = [];
for (let i = 0; i < completed.length; i++) {
  for (let j = i + 1; j < completed.length; j++) {
    const a = completed[i], b = completed[j];
    const shared = a.actual_files.filter(f => b.actual_files.includes(f));
    if (shared.length > 0) overlaps.push({ a: a.id, b: b.id, shared });
  }
}

// (c) lock conflicts — file-locking.md protocol violations
const lockDir = '.stelow/' + tracking.workflows[0]?.dirHash + '/locks';
const lockConflicts = [];
try {
  for (const f of fs.readdirSync(lockDir)) {
    const lock = JSON.parse(fs.readFileSync(lockDir + '/' + f, 'utf8'));
    const expires = new Date(lock.expires_at).getTime();
    if (expires < Date.now()) lockConflicts.push({ lock: f, scope: lock.scope_id, file: lock.file, status: 'stale' });
  }
} catch {}

console.log(JSON.stringify({ undeclared, overlaps, lockConflicts }, null, 2));
" > overlap-report.json
```

**4-class overlap report:**

| Class | Definition | Action |
|---|---|---|
| **(a) undeclared writes** | Scope touched files outside its declared `target_files` | Human review — possible contract violation, possible scope creep |
| **(b) real overlaps** | Two scopes wrote the same file (no lock or lock stolen) | Human decision: merge, sequential re-run, or rework |
| **(c) stale locks** | Locks left behind past `expires_at` (agent crashed mid-edit) | Auto-recover on next acquire; surface for visibility |
| **(d) clean** | declared == actual, no inter-scope overlap, no stale locks | ✅ No action |

Append the overlap result to the report. If any non-clean class is non-empty, surface it to the human for decision.

**Save to:** `docs/{YYYY-MM-DD}/{slug}/execution-report.md`

```
📊 Execution Results: {plan-name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [SCOPE-1] Login — feature — DONE (2/3 iterations, 3 files, 2 reviews passed)
✅ [SCOPE-2] Search optimization — optimization — DONE (latency 180ms, target <200ms ✓)
✅ [SCOPE-3] Vector DB eval — spike — DONE (recommendation in docs/spikes/)
⚠️ [SCOPE-4] Dashboard — feature — ESCALATED (3/3 iterations, last error: e2e timeout)

📋 Overlap report: {overlap-report.json}
  class (a) undeclared writes: {n}
  class (b) real overlaps:      {n}
  class (c) stale locks:        {n}
  class (d) clean scopes:       {n}

Timeline: {total duration}
Commits: {commit hashes for each scope}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next steps:
- Review overlap report (classes a/b/c need human attention)
- Handoff to Verification: run test suite, code review, UI/browser testing
```

---

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
   ├── Execute features → iteration loop (worker + verify + review + quality, repeat until criteria met)
   ├── Execute optimizations → goals tool (see goals.md, Optimization Goals)
   ├── Execute spikes → scout + researcher
   └── Report consolidated results to execution-report.md
7. [HANDOFF] → Verification stage (full test suite, code review, UI/browser testing)
   See the `stelow-product-testing-execution` skill for the testing protocol.
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
- Skills: `stelow-product-scope-executor` + `goals` (optimization goals via subagent + acceptance)
- Context: fresh
- Reads: spec-tech.md + scope-contract.json (acceptance IS the contract; history is noise)

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
- **Use the right tool for each type** — iteration loop for features, goals tool for optimization, scout for spikes
- **Handle failures gracefully** — one failed scope doesn't block the rest
- **Produce a clear final report** — what was done, what changed, what failed

Weak execution runs:
- **Run everything sequentially** when parallel is safe
- **Treat optimization scopes as plain worker tasks instead of using the goals tool** (loses the optimization loop advantage)
- **Ignore scope types** and treat everything as implementation
- **Block on minor failures** or reviewer feedback
