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

If the scope declared `[TARGET_FILES]` (see Step 2e) AND the orchestrator plans parallel dispatch, check room then acquire via the CLI (protocol in `cli-tools/file-locking.md`):

```bash
# Resolve TTL from `[LOCK_TTL_SECONDS]` block if present; default 1800.
TTL_ARGS=()
if [ -n "${LOCK_TTL_BLOCK:-}" ]; then TTL_ARGS=(--ttl "$LOCK_TTL_BLOCK"); fi

# Check existing locks for any of this scope's target_files
scripts/stelow lock check --scope "$SCOPE_ID" "${TARGET_FILES[@]}" --json
# → {"locks": []} means room; non-empty means abort parallel dispatch:
# either (a) sequential re-dispatch, or (b) wait for lock expiry.
# Orchestrator decides next step (sequential re-run or wait).

# Acquire locks
scripts/stelow lock acquire --scope "$SCOPE_ID" "${TARGET_FILES[@]}" "${TTL_ARGS[@]}"
# exit 1 names the holder: LOCK CONFLICT: <file> held by <scope>
```

The lock protocol is **opt-in for the agent**: skip this step entirely if the scope has no `target_files` declared OR sequential dispatch is in use. See `file-locking.md` for TTL semantics and stale-lock stealing.

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
| **Acceptance-native** | Delegate tool with acceptance contract | Runtime reopens child session for self-correction |
| **Isolated subagents** | Delegate tool with `agent` + `task` (+ fresh context per the tool's default) | Child self-validates; parent receives structured result, re-delegates on gaps |
| **Headless / universal** | Execute directly in current session, save outputs to files | Manual iteration in parent context |

**Example: acceptance-native delegation**

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
   - **UI/visual scope:** `stelow-workflow-ux-critique` — accessibility (WCAG POUR), Nielsen heuristics, visual hierarchy, cognitive load.
   - **Codebase-only scope:** `stelow-workflow-codebase-critique` — architecture, data flow, API contracts, performance.
   - **Both or unclear:** Run both.
4. **Parallel code review:**
   - Correctness reviewer (regressions, edge cases)
   - Simplicity reviewer (load `stelow-workflow-coding-standards` — KISS, DRY, LoB/SoC, Fail Fast, YAGNI)

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

If locks were acquired in Step 3c, release them now (`scripts/stelow lock release --scope "$SCOPE_ID" "${TARGET_FILES[@]}"`). See `cli-tools/file-locking.md`.

**Report per scope:**
```
✅ [SCOPE-1] Login — DONE (acceptance verified, 3 files, 2 reviews passed)
⚠️ [SCOPE-2] Dashboard — ESCALATED (3 iterations, last error: e2e test timeout)
```

> **Why file persistence?** LLM context can be compacted or cleared. The state file ensures the iteration loop resumes correctly after any context loss. This pattern is harness-agnostic — any agent with file system access can read/write the same format. The `actual_files` field enables the post-execution overlap check (Step 8).

