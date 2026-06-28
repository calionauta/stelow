## Execution: Supervisor + Scope Execution

> **Part of stelow** — See [`SKILL.md`](./SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.
### ⚠️ Activate the supervisor ONLY during execution
**Never activate during stages before Execution.** The supervisor would re-submit Plannotator.
**Activate in Execution stage only** — when starting scope execution.

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

### execution:05 — Task Checklist + Plannotator

Before executing, break each scope into concrete tasks and write them to
`checklist.md`. This file serves as:
- **Persistence** across sessions (replaces phase-todos.json)
- **Real-time visibility** via Plannotator (browser checkboxes)
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

**2. Open Plannotator for real-time tracking:**

```bash
# If Plannotator is installed, open the checklist in browser
if command -v plannotator &>/dev/null; then
  plannotator annotate "$CHECKLIST" &
  echo "📋 Checklist opened in browser — view-only, no action needed. Tracks progress as scopes complete."
else
  echo "📋 Checklist written to $CHECKLIST"
  echo "💡 Install Plannotator (npx skills add plannotator) for browser view"
fi
```

> The Plannotator tab shows checkboxes updating in real time as the LLM
> marks tasks complete. Refresh to see latest state.

**3. Every turn end, sync memory to checklist.md:**

Keep `checklist.md` updated with current task status. The file IS the source
of truth — CLI-native todos (TodoWrite, rpiv-todo) are display-only.

---

### execution:10 — Scope Executor Routing

> **Goal system:** See `references/cli-tools/goals.md` for all scope types —
> optimization scopes use the goals tool with benchmark verify commands.

**Before routing, read appetite from spec-product.md.**
```bash
APPETITE=$(grep -oP '^appetite:\s*\K\S+' .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "Core")
```

**Supervisor decision by appetite** (see `references/cli-tools/supervise.md` for full reference):

| Appetite | Supervisor | Sensitivity | Human-in-loop | Rationale |
|----------|-----------|-------------|---------------|----------|
| `Lean` | **Activate** | `low` | No | Even small scopes can drift over multiple turns. Low sensitivity catches clear deviations without false-positive noise. |
| `Core` | **Activate** | `medium` | No | Standard feature scope. Medium sensitivity balances steering vs autonomy. |
| `Complete` | **Activate** | `high` | No | High-risk, multi-scope work. High sensitivity ensures drift is caught early. |

> **Human-in-loop is controlled by Review Mode** (from `index.json`), not by appetite.
> Review Mode = "All Above + Scopes In/Out" or "All Above + Tech Review" may add human approval checkpoints per PR.

| Scope Type | Executor | Supervision |
|---|---|---|
| `[TYPE] optimization` | goals tool (see `references/cli-tools/goals.md`, Optimization Goals) | Metric verify (auto) |
| `[EXECUTOR] optimization-goal` | goals tool (see `references/cli-tools/goals.md`, Optimization Goals) | Metric verify (auto) |
| Spike with metric | goals tool (see `references/cli-tools/goals.md`, Optimization Goals) | Metric verify (auto) |
| `feature` | iteration loop (see scope-executor Step 3 — implement → verify → review → quality, repeat until criteria met or `[MAX_ITERATIONS]` exhausted) | `/supervise` with outcome = DoD |
| Refactoring without metric | goals tool (see `references/cli-tools/goals.md`) — CLI fallback: ordered-execution-goal (`/sisyphus-set`) | `/supervise` with outcome = DoD |
| Investigative spike | goals tool (see `references/cli-tools/goals.md`) — CLI fallback: ordered-execution-goal (`/sisyphus-set`) | `/supervise` with outcome = DoD |
| Interface alternatives | goals tool (see `references/cli-tools/goals.md`) — CLI fallback: ordered-execution-goal (`/sisyphus-set`) | `/supervise` with outcome = DoD |
| `test-unit` | goals tool (see `references/cli-tools/goals.md`) — CLI fallback: ordered-execution-goal (`/sisyphus-set`) | Testing gates (see below) |
| `test-integration` | goals tool (see `references/cli-tools/goals.md`) — CLI fallback: ordered-execution-goal (`/sisyphus-set`) | Testing gates (see below) |
| `test-security` | goals tool (see `references/cli-tools/goals.md`) — CLI fallback: ordered-execution-goal (`/sisyphus-set`) | Testing gates (see below) |
| `test-behavior` | goals tool (see `references/cli-tools/goals.md`) — CLI fallback: ordered-execution-goal (`/sisyphus-set`) | Testing gates (see below) |

### When starting execution of each scope:

1. **Read appetite** from spec-product.md:
   ```bash
   APPETITE=$(grep -oP '^appetite:\s*\K\S+' .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "Core")
   ```

2. **Feature/refactor/spike without metric → goals tool** (see `references/cli-tools/goals.md`)
   - CLI fallback: **ordered-execution-goal** (`/sisyphus-set`, no discussion, starts immediately)
   - **Supervisor:** See the canonical appetite-based decision table in `execution:20` above. Activate with:
     ```
     /supervise outcome="Execute scope '{scope_name}' per spec-tech.md.
     DoD: {DoD}. AC: {acceptance criteria}. Do not deviate from approved scope."
     ```
     Add `sensitivity: "medium"` if appetite = Core.
   - The supervisor detects deviation and re-centers if the LLM leaves scope

3. **Optimization/spike with metric → goals tool** (see `references/cli-tools/goals.md`, Optimization Goals)
   - No supervisor needed (goals tool with benchmark verify is self-supervising via metric)

3. **If blocked:** `pause_goal` with reason documenting the blockage

4. **Scope adjustment:** `/goal-tweak` if scope needs modification during execution

> **Tip:** `/supervise` is especially useful for long scopes where the LLM
> may forget the original objective. Activate WHEN STARTING the scope, not before.

### execution:20 — Testing Gates (AI-Aware Testing for Software Products)

**For test-* scopes, hard blocks are enforced:**

| Gate | Condition | Action | Rationale |
|------|-----------|--------|----------|
| **Critical Path Tests** | missing required tests | 🔴 BLOCK | AI code has 1.7x more bugs; critical paths need executable regression checks |
| **Security Findings** | security_findings > 0 on critical paths | 🔴 BLOCK | 45% of AI code contains vulnerabilities (Veracode 2025) |
| **Flaky Tests** | flaky_rate > 5% | 🟡 WARN | Agents generate non-deterministic tests |
| **Test Execution** | duration > 10min | 🟡 WARN | CI/CD pipeline impact |

**Security scanning:**
- Run SAST on every commit for critical paths
- Block if CVSS >= 7.0 vulnerabilities found
- 2.5x more critical vulnerabilities in AI code (ACM TOSEM)

**Anti-patterns to detect:**
- ❌ Over-mocking (>3 mocks per test) — agents use mocks 36% vs 26% for humans
- ❌ 100% coverage target — coverage ≠ test quality
- ❌ Single-run validation — agents are non-deterministic
- ❌ Snapshot tests for non-UI components

See the `cali-product-testing-ai-code` skill

## Execution — AUTOMATIC

> **CRITICAL: After Tech Planning approval, execution is MANDATORY.**
> Do NOT ask the user "what to do next". The workflow proceeds automatically.

### Execution Flow

After Plannotator approval on spec-tech_v{N}.md:

1. **Worktree check** (if modifying code in shared repo)
2. **Route to executor** based on scope type:

| Scope Type | Executor | Command |
|------------|----------|--------|
| `feature` | goals tool (see `references/cli-tools/goals.md`) + `/supervise` | see the `cali-product-scope-executor` skill for instructions |
| `optimization` | goals tool (see `references/cli-tools/goals.md`, Optimization Goals) | see the `cali-product-scope-executor` skill for instructions |
| `spike` | goals tool (see `references/cli-tools/goals.md`) + `/supervise` | see the `cali-product-scope-executor` skill for instructions |
| `test-*` | goals tool (see `references/cli-tools/goals.md`) + testing gates | see the `cali-product-scope-executor` skill for instructions |

### Executing Scopes

**Use the `cali-product-scope-executor` skill** — this routes each scope to its correct executor.

**For feature scopes:**

Feature scopes use an **auto-iteration loop** (see `cali-product-scope-executor` Step 3):
implement → verify (tests, lint, typecheck) → quality checks → parallel review → evaluate.
If criteria fail, the next iteration receives accumulated feedback. The loop repeats until
success or `[MAX_ITERATIONS]` exhaustion (default: 3), then escalates to human.

**For optimization scopes:**

Use the goals tool (see `references/cli-tools/goals.md` → Optimization Goals) to create an optimization goal with benchmark verify commands and iteration loop.

**For iteration loops:** feature scopes use `cali-product-scope-executor` Step 3;
optimization scopes use `goals.md` → Optimization Goals section.

### ⚠️ NEVER ASK

After Tech Planning approval, **DO NOT** ask:
- "Would you like to execute now?"
- "Create ordered-execution-goal?"
- "Review plan first?"
- Any variation of "what would you like to do next"

**The workflow proceeds automatically: Execution → Verification → Code Quality Gate (conditional) → Execution Critique.**

### Worktree (optional)

Only ask about worktree if modifying code in shared repository AND multiple workflows run in parallel.

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
3. at least one appetite/review mode condition below is true

#### Appetite + review mode matrix

| Appetite | Review Mode | Decision |
|----------|-------------|----------|
| `Lean` | any | **Skip** unless the user explicitly requests it. |
| `Core` | `Auto` / `Only Product Spec` | **Skip** unless risk is high. |
| `Core` | `Product Spec + Interface Choice` / `All Above + Scopes In/Out` | Run when risk is high. |
| `Core` | `All Above + Tech Review` | Run when risk is high or the diff is meaningful. |
| `Complete` | `Auto` / `Only Product Spec` | **Run** if code changed. Resolve/document findings without asking. |
| `Complete` | `Product Spec + Interface Choice` | **Run** if code changed. Escalate P0/P1 gaps to the user. |
| `Complete` | `All Above + Scopes In/Out` | **Run** if code changed. P0/P1 gaps need fix or explicit human acceptance. |
| `Complete` | `All Above + Tech Review` | **Mandatory** for software/hybrid code changes. Blocking gate before merge. |

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

See `references/cli-tools/codequality-review.md` for the full trigger policy.

---

### Advanced: Git Worktree Isolation

> ⚠️ **Not recommended for most workflows.** Execute in the current directory
> unless you have parallel scopes that modify the same files AND you understand
> git worktree merge.

If you have multiple parallel scopes that touch overlapping files, a git worktree
isolates each scope's changes on its own branch:

```bash
# Create worktree on a new branch from main
git fetch origin 2>/dev/null || true
BASE_BRANCH=$(git remote show origin 2>/dev/null |
  grep "HEAD branch" | cut -d" " -f5 || echo "main")
git worktree add .worktrees/sw-{name}-{date} \
  -b pw/{name}/{YYYY-MM-DD} "$BASE_BRANCH"
```

**After execution, merge back:**
```bash
git checkout "$BASE_BRANCH"
git merge pw/{name}/{YYYY-MM-DD}
git push origin "$BASE_BRANCH"
git worktree remove .worktrees/sw-{name}-{date}
git branch -D pw/{name}/{YYYY-MM-DD}
```

**Merge conflicts:** resolve manually or use `git mergetool`. If conflicts
are extensive, consider sequential execution instead.
