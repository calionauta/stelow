## Execution: Supervisor + Scope Execution

> **Part of cali-product-workflow** — See [`SKILL.md`](./SKILL.md) for stage sequence, safety rules, and capability reference.
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
cat .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_v{N}.md
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
  .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_v{N}.md 2>/dev/null | sort -u)
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

### execution:10 — Git Worktree Check

**Check if the workflow is in an isolated directory.** If multiple workflows
modify the same code in parallel, use a worktree to avoid conflicts:

```bash
if git rev-parse --git-dir | grep -q '.git/worktrees/'; then
  echo "INSIDE_WORKTREE"
else
  echo "MAIN_REPO"
fi
```

**If in the main repository (`MAIN_REPO`) and modifying code:**
Use the ask tool (see `references/cli-tools/structured-question.md`) with Pattern 1 from `stages/ask-patterns.md` for the worktree decision.

```markdown
Question: This workflow will modify code. Create an isolated branch + worktree?
Options:
  - Yes — create isolated worktree (Recommended)
  - No — execute in current directory
```
```

**If Yes:**
```bash
BASE_BRANCH=$(git remote show origin 2>/dev/null | grep "HEAD branch" | cut -d" " -f5 || echo "main")
git fetch origin 2>/dev/null || true
git worktree add .worktrees/pw-{name}-{date} -b pw/{name}/{YYYY-MM-DD} "$BASE_BRANCH"
cd .worktrees/pw-{name}-{date}
echo "WORKTREE_ACTIVE"
```

- Copy the approved plan (`.cali-product-workflow/`) to the worktree if needed
- Execute all scopes inside the worktree
- At the end, ask: "Commit + push?" and "Remove worktree?"

**If No or already in a worktree:**
Proceed directly to scope execution in the current directory.

> ⚠️ The worktree **is not mandatory**. Workflows with 1 scope or no code
> changes can skip this step. The question is always optional.

### execution:20 — Scope Executor Routing

> **Goal system:** See `references/cli-tools/goals.md` for all scope types —
> optimization scopes use the goals tool with benchmark verify commands.

**Before routing, read appetite from spec-product.md.**
```bash
APPETITE=$(grep -oP '^appetite:\s*\K\S+' .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "Focused")
```

**Supervisor decision by appetite** (see `references/cli-tools/supervise.md` for full reference):

| Appetite | Supervisor | Sensitivity | Human-in-loop | Rationale |
|----------|-----------|-------------|---------------|----------|
| `PoC` | **Skip** | — | No | Scope is 1 component. Drift is impossible — no context to degrade. |
| `Focused` | **Activate** | `low` | No | Short scope. Low sensitivity avoids false positives on minor detours. |
| `Comprehensive` | **Activate** | `medium` | No | Multiple scopes increase drift surface area; standard supervision. |

> **Human-in-loop is controlled by Mode** (from `index.json`), not by appetite.
> Mode = Full Product or Full Tech may add human approval checkpoints per PR.

| Scope Type | Executor | Supervision |
|---|---|---|
| `[TYPE] optimization` | goals tool (see `references/cli-tools/goals.md`, Optimization Goals) | Metric verify (auto) |
| `[EXECUTOR] optimization-goal` | goals tool (see `references/cli-tools/goals.md`, Optimization Goals) | Metric verify (auto) |
| Spike with metric | goals tool (see `references/cli-tools/goals.md`, Optimization Goals) | Metric verify (auto) |
| `feature` | goals tool (see `references/cli-tools/goals.md`) — CLI fallback: ordered-execution-goal (`/sisyphus-set`) | `/supervise` with outcome = DoD |
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
   APPETITE=$(grep -oP '^appetite:\s*\K\S+' .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "Focused")
   ```

2. **Feature/refactor/spike without metric → goals tool** (see `references/cli-tools/goals.md`)
   - CLI fallback: **ordered-execution-goal** (`/sisyphus-set`, no discussion, starts immediately)
   - **Supervisor:** See the canonical appetite-based decision table in `execution:20` above. Activate with:
     ```
     /supervise outcome="Execute scope '{scope_name}' per spec-tech.md.
     DoD: {DoD}. AC: {acceptance criteria}. Do not deviate from approved scope."
     ```
     Add `sensitivity: "low"` if appetite = Focused.
   - The supervisor detects deviation and re-centers if the LLM leaves scope

3. **Optimization/spike with metric → goals tool** (see `references/cli-tools/goals.md`, Optimization Goals)
   - No supervisor needed (goals tool with benchmark verify is self-supervising via metric)

3. **If blocked:** `pause_goal` with reason documenting the blockage

4. **Scope adjustment:** `/goal-tweak` if scope needs modification during execution

> **Tip:** `/supervise` is especially useful for long scopes where the LLM
> may forget the original objective. Activate WHEN STARTING the scope, not before.

### execution:30 — Testing Gates (AI-Aware Testing for Software Products)

**For test-* scopes, hard blocks are enforced:**

| Gate | Condition | Action | Rationale |
|------|-----------|--------|----------|
| **Mutation Score** | mutation_score < target | 🔴 BLOCK | AI code has 1.7x more bugs; mutation testing validates test quality |
| **Security Findings** | security_findings > 0 on critical paths | 🔴 BLOCK | 45% of AI code contains vulnerabilities (Veracode 2025) |
| **Flaky Tests** | flaky_rate > 5% | 🟡 WARN | Agents generate non-deterministic tests |
| **Test Execution** | duration > 10min | 🟡 WARN | CI/CD pipeline impact |

**Mutation testing loop:**
1. Generate tests (AI)
2. Run mutation testing (Stryker/PIT/mutmut)
3. If mutation_score < target → feed surviving mutants back to AI
4. Repeat until target reached

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

Use the goals tool (see `references/cli-tools/goals.md`) to create a goal with acceptance criteria from the scope's DoD. The goals reference documents all supported patterns.

**For optimization scopes:**

Use the goals tool (see `references/cli-tools/goals.md` → Optimization Goals) to create an optimization goal with benchmark verify commands and iteration loop.

For iteration loops, see goals.md → Optimization Goals section.

### ⚠️ NEVER ASK

After Tech Planning approval, **DO NOT** ask:
- "Would you like to execute now?"
- "Create ordered-execution-goal?"
- "Review plan first?"
- Any variation of "what would you like to do next"

**The workflow proceeds automatically: Execution → Verification → Execution Critique.**

### Worktree (optional)

Only ask about worktree if modifying code in shared repository AND multiple workflows run in parallel.

### Code Quality Gate (Optional)

**Trigger `codequality-review` before final commit:**

Use `/skill:thermo-nuclear-code-quality-review` as final quality gate after executing scopes.

#### When to Run

| Moment | Recommendation |
|--------|---------------|
| Gate final (before commit) | ✅ Always — validates all executed scopes |
| Per-scope (optional) | ✅ Ask user if scope meets criteria |

#### Scope Complexity Assessment

After completing a scope, assess if codequality-review should run:

```markdown
Did this scope:
- Add >200 LOC total?
- Modify >2 files?
- Introduce new abstractions/helpers?
- Cross any file past 1000 lines?

If YES to any → run codequality-review
If NO to all → proceed (review at final gate)
```

#### Fallback (Not Installed)

If `codequality-review` is not available:
- Manually review for files >1000 lines
- Check functions for complexity >5
- Look for leaky abstractions and dead code
- Run `eslint --max-warnings=0` and `tsc --noEmit`

See `references/cli-tools/codequality-review.md` for full documentation.
