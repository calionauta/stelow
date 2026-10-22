## Execution: Scope Execution

> **Part of stelow** — See [`SKILL.md`](../SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.
### ⚠️ Context Rot + Plan Staleness Check (before executing)

**Reading spec-tech.md from disk.** The plan was generated in a previous session
or a potentially degraded context. Re-read `spec-tech.md` from the directory
to ensure you're working with the correct version, not conversation memory.

```bash
# Always read from disk
cat .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_v{N}.md
```

If the plan seems inconsistent with what you remember, **trust the file**,
not your memory.

### Read Selected Interface Artifact

If an interface was chosen and saved as `selected-interface.md`, read it for UI direction:

```bash
INTERFACE=".stelow/{YYYY-MM-DD}/{_dir}/interfaces/selected-interface.md"
if [ -f "$INTERFACE" ]; then
  echo "SELECTED_INTERFACE_FOUND"
  cat "$INTERFACE"
fi
```

The selected interface contains the work pattern, breadboarding, ASCII sketches, interaction flow, and trade-off analysis. Follow its direction — do NOT regenerate or reinterpret the interface during execution.

### Read Selected Architecture Artifact

If an architecture was chosen and saved as `selected-architecture.md`, read it for construction direction:

```bash
ARCHITECTURE=".stelow/{YYYY-MM-DD}/{_dir}/architecture/selected-architecture.md"
if [ -f "$ARCHITECTURE" ]; then
  echo "SELECTED_ARCHITECTURE_FOUND"
  cat "$ARCHITECTURE"
fi
```

The selected architecture contains the construction pattern, component sketch, construction flow, and trade-off analysis. Follow its direction — do NOT regenerate or reinterpret the architecture during execution.

### ⚠️ Plan Staleness Detection (before scope execution)

**Check if target files changed since the plan was created.** The plan was
written against a codebase snapshot. If files referenced in the plan have
changed, the plan may be stale.

```bash
# Extract referenced file paths from spec-tech.md and diff against HEAD
PATHS=$(grep -oP 'src/[a-zA-Z0-9_/.-]+\.(go|ts|js|py|rs)' \
  .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_v{N}.md 2>/dev/null | sort -u)
if [ -n "$PATHS" ]; then
  STALE=$(git diff HEAD -- $PATHS 2>/dev/null | head -20)
  if [ -n "$STALE" ]; then
    echo "PLAN_STALE_DETECTED"
    echo "Target files changed since plan was created:"
    git diff --stat HEAD -- $PATHS 2>/dev/null
  else
    echo "PLAN_CURRENT"
  fi
fi
```

**If staleness detected:** Alert the user: "Target files have changed since the
plan was created. Verify the plan is still valid before proceeding."
Ask if they want to (1) proceed anyway, (2) review the diff and adjust,
or (3) stop and re-plan.

---

### execution:05 — Task Checklist + visual review

Before executing, break each scope into concrete tasks and write them to
`checklist.md`. This file serves as:
- **Persistence** across sessions (replaces phase-todos.json)
- **Real-time visibility** via visual review (browser checkboxes)
- **Scope completion signal** for stelow's gate (`/sw-next`)

**1. Build the checklist from spec-tech.md scopes:**

```bash
CHECKLIST=".stelow/{YYYY-MM-DD}/{_dir}/checklist.md"
{
  echo "# Execution: {_dir}"
  echo ""
  # For each scope, derive tasks from objectives + DoD + ACs
  echo "### SCOPE-1: Auth Foundation"
  echo "- [ ] Create users table migration"
  echo "- [ ] Implement signup endpoint"
  echo "- [ ] Implement login endpoint"
  echo ""
  echo "### SCOPE-2: Token Refresh"
  echo "- [ ] Create refresh token table"
  echo "- [ ] Implement refresh endpoint"
} > "$CHECKLIST"
```

**Rules:**
- Each `### SCOPE-N:` header must match a scope name in `stelow.json`
- Each `- [ ]` is one concrete task (small enough to do in one LLM turn)
- Do NOT add IDs — order in file is the ID
- Do NOT duplicate blockedBy/type metadata — that lives in stelow.json scopes

**2. Open visual review for real-time tracking:**

```bash
# If visual review is installed, open the checklist in browser
if command -v visual_review &>/dev/null; then
  visual_review annotate "$CHECKLIST" &
  echo "📋 Checklist opened in browser — view-only, no action needed. Tracks progress as scopes complete."
else
  echo "📋 Checklist written to $CHECKLIST"
  echo "💡 Install visual review (npx skills add visual_review) for browser view"
fi
```

> The visual review tab shows checkboxes updating in real time as the LLM
> marks tasks complete. Refresh to see latest state.

**3. Every turn end, sync memory to checklist.md:**

Keep `checklist.md` updated with current task status. The file IS the source
of truth — harness-native todos are display-only.

---

### execution:10 — Scope Executor Routing

> **Goal system:** See `../references/cli-tools/goals.md` for all scope types —
> optimization scopes use the acceptance contract with benchmark verify commands.
> Every scope reads its frozen contract (`scopes/{scope-id}.json`:
> `test_map` / `freeze_sha` / `red_proof` / `baseline`); a scope with an
> unmapped AC (AC-sem-teste) is rejected before dispatch.

**No separate supervision pass is needed here, and none is registered.** An
earlier revision of this stage read a `supervisor` knob (`low`/`med`/`high`)
from `spec-product.md` and activated a mid-flight checkpoint every 3 to 10 tool
calls. That knob was retired: it steered nothing a scope-close gate did not
already prove, and each checkpoint cost a full headless harness spawn — the most
expensive operation this reference describes, spent to re-read work the
acceptance contract verifies with evidence on disk. Drift has a door without it:
the parent-controlled loop re-delegates on a failed verify with a fresh context
per iteration, and the close gates below refuse the scope outright.

The columns that remain are the enforcement that does run, per scope type:

| Scope Type | Executor | Enforcement |
|---|---|---|
| `[TYPE] optimization` | acceptance contract (see `../references/cli-tools/goals.md`, Optimization Goals) | Metric verify (auto) |
| `[EXECUTOR] optimization-goal` | acceptance contract (see `../references/cli-tools/goals.md`, Optimization Goals) | Metric verify (auto) |
| Spike with metric | acceptance contract (see `../references/cli-tools/goals.md`, Optimization Goals) | Metric verify (auto) |
| `feature` | iteration loop (see scope-executor Step 3 — implement → verify → review → quality, repeat until criteria met or `[MAX_ITERATIONS]` exhausted) | acceptance contract (DoD as outcome) + red-first close gate |
| Refactoring without metric | acceptance contract (see `../references/cli-tools/goals.md`) — without native acceptance: parent-controlled loop | acceptance contract |
| Investigative spike | acceptance contract (see `../references/cli-tools/goals.md`) — without native acceptance: parent-controlled loop | acceptance contract |
| Interface alternatives | acceptance contract (see `../references/cli-tools/goals.md`) — without native acceptance: parent-controlled loop | acceptance contract |
| `test-unit` | acceptance contract (see `../references/cli-tools/goals.md`) — without native acceptance: parent-controlled loop | Testing gates (see below) |
| `test-integration` | acceptance contract (see `../references/cli-tools/goals.md`) — without native acceptance: parent-controlled loop | Testing gates (see below) |
| `test-security` | acceptance contract (see `../references/cli-tools/goals.md`) — without native acceptance: parent-controlled loop | Testing gates (see below) |
| `test-behavior` | acceptance contract (see `../references/cli-tools/goals.md`) — without native acceptance: parent-controlled loop | Testing gates (see below) |

### When starting execution of each scope:

1. **No supervision pass to start.** The retired `supervisor` knob is gone; the
   enforcing gates are scope close (red-first + frozen acceptance, below) and
   the parent-controlled loop's verify step.

2. **Feature/refactor/spike without metric → acceptance contract** (see `../references/cli-tools/goals.md`)
   - Without native acceptance: **parent-controlled loop** (delegate → verify → fix → repeat, no discussion, starts immediately)
   - Drift is caught by the verify commands and the close gates, not by a mid-flight reader

3. **Optimization/spike with metric → acceptance contract** (see `../references/cli-tools/goals.md`, Optimization Goals)
   - The acceptance contract with benchmark verify is self-enforcing via metric

3. **If blocked:** record the blockage with reason, pause the scope, flag to user

4. **Scope adjustment:** re-plan the scope if it needs modification during execution (never silently expand)

> **Tip:** the acceptance contract is most valuable on long scopes where the LLM
> may lose the original objective. Its verify commands run at scope start and
> again at close — the two points where the DoD is actually checked.

### execution:20 — Testing Gates (AI-Aware Testing for Software Products)

Canonical gates + anti-patterns: `../../stelow-workflow-testing-ai-code/references/guard-contract.md`.
For test-* scopes, hard blocks enforced per that contract. See the `stelow-workflow-testing-ai-code` skill.

## Execution — AUTOMATIC

> **CRITICAL: After Tech Planning approval, execution is MANDATORY.**
> Do NOT ask the user "what to do next". The workflow proceeds automatically.

### Execution Flow

After visual review approval on spec-tech_v{N}.md:

1. **Worktree check** (if modifying code in shared repo)
2. **Route to executor** based on scope type:

| Scope Type | Executor | Command |
|------------|----------|--------|
| `feature` | acceptance contract (see `../references/cli-tools/goals.md`) | see the `stelow-workflow-scope-executor` skill for instructions |
| `optimization` | acceptance contract (see `../references/cli-tools/goals.md`, Optimization Goals) | see the `stelow-workflow-scope-executor` skill for instructions |
| `spike` | acceptance contract (see `../references/cli-tools/goals.md`) | see the `stelow-workflow-scope-executor` skill for instructions |
| `test-*` | acceptance contract (see `../references/cli-tools/goals.md`) + testing gates | see the `stelow-workflow-scope-executor` skill for instructions |

### Executing Scopes

**Use the `stelow-workflow-scope-executor` skill** — this routes each scope to its correct executor.

**For feature scopes:**

Feature scopes use an **auto-iteration loop** (see `stelow-workflow-scope-executor` Step 3):
implement → verify (tests, lint, typecheck) → quality checks → parallel review → evaluate.
If criteria fail, the next iteration receives accumulated feedback. The loop repeats until
success or `[MAX_ITERATIONS]` exhaustion (default: 3), then escalates to human.

**For optimization scopes:**

Use the acceptance contract (see `../references/cli-tools/goals.md` → Optimization Goals) to create an optimization goal with benchmark verify commands and iteration loop.

**For iteration loops:** feature scopes use `stelow-workflow-scope-executor` Step 3;
optimization scopes use `goals.md` → Optimization Goals section.

**Renames across files:** a rename that spans files is a structural change,
never a text edit. Use `ast-grep run -p 'OLD' -r 'NEW' -l <lang>` (AST-safe,
skips strings/comments) — never grep+sed. See `../references/cli-tools/code-map.md`
(structural section) for the pattern form.

### ⚠️ NEVER ASK

After Tech Planning approval, **DO NOT** ask:
- "Would you like to execute now?"
- "Create a goal?"
- "Review plan first?"
- Any variation of "what would you like to do next"

**The workflow proceeds automatically: Execution → Verification → Code Quality Gate (conditional) → Execution Critique.**

### Code Quality Gate (Post-Verification, Conditional)

`thermo-nuclear-code-quality-review` is an optional ultra-strict maintainability
gate. It is **not installed by default** and must not replace the normal
verification flow.

Run it only after all verification steps pass and before the final commit/merge.
Save or copy the result to:

```text
.stelow/{YYYY-MM-DD}/{_dir}/verification/code-quality-review.md
```

#### Run condition

Run `thermo-nuclear-code-quality-review` when all of these are true:

1. `product_type` is `software` or `hybrid`
2. the diff includes code changes
3. at least one quality/review mode condition below is true

#### Quality + review mode matrix

| Quality | Review Mode | Decision |
|----------|-------------|----------|
| `experimental` | any | **Skip** unless the user explicitly requests it. |
| `production` | `Auto` / `Product Spec Gate` | **Run** if code changed. Resolve/document findings without asking. |
| `production` | `Product Spec + Interface Gates` | **Run** if code changed. Escalate P0/P1 gaps to the user. |
| `production` | `Product Spec + Interface + Scopes` | **Run** if code changed. P0/P1 gaps need fix or explicit human acceptance. |
| `production` | `Product Spec + Interface + Tech Review` | **Mandatory** for software/hybrid code changes. |
| `production` | `Product Spec + Interface + Tech Review + Code Diff` | **Mandatory** for software/hybrid code changes. Code diff gate runs after fix. |

#### High-risk trigger

Treat risk as high when any condition is true:

- auth, payments, permissions, data persistence, migrations, API contracts, queues/jobs, or security-sensitive paths changed
- new shared abstraction, framework integration, architecture boundary, or public contract changed
- diff touches `>= 5` files, `>= 200` LOC, or any file over `1000` lines
- function complexity, cyclomatic complexity, or maintainability risk is likely to exceed normal review capacity
- prior verification found correctness, performance, or security concerns that need a deeper review

#### Fallback (not installed)

If `thermo-nuclear-code-quality-review` is not installed:

- run the normal code-quality-gate checks from `verification.md`
- manually check files over `1000` lines, functions over `150` lines, complexity over `5`, leaky abstractions, and dead code
- document the skipped external review in the verification notes

See `../references/cli-tools/codequality-review.md` for the full trigger policy.

---

### Scope execution ordering and parallelism

Parallel scope execution defaults to **DAG-independent + sequential** unless
the orchestrator explicitly pairs scopes for concurrent dispatch. When
parallel scope execution IS used, file overlap is detected **post-execution**
via `git diff --name-only` capture (see `stelow-workflow-scope-executor` Step 3e
"Persist state" — `actual_files` field) — NOT predicted pre-execution.

This is **audit, not prevention**: stelow surfaces overlap AFTER both scopes
finish, so a human can decide (merge, sequential re-run, or rework) before
the workflow advances. Stelow does not ship a runtime working-directory
isolation layer; users who need prevention configure their harness directly
(see `../references/cli-tools/subagents.md` for per-CLI parallel syntax).
Merge conflicts are resolved manually; if conflicts are extensive, fall
back to sequential execution.
