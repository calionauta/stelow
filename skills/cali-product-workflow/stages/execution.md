## Execution: Supervisor + Scope Execution

> **Part of cali-product-workflow** — See [`SKILL.md`](./SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.
### ⚠️ Activate the supervisor ONLY during execution
**Never activate during stages before Execution.** The supervisor would re-submit Plannotator.
**Activate in Execution stage only** — when starting scope execution.

### ⚠️ Context Rot Check (before executing)

**Reading spec-tech.md from disk.** The plan was generated in a previous session
or a potentially degraded context. Re-read `spec-tech.md` from the directory
to ensure you're working with the correct version, not conversation memory.

```bash
# Always read from disk
cat .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_v{N}.md
```

If the plan seems inconsistent with what you remember, **trust the file**,
not your memory.

---

### 6a. Git Worktree Check (before executing scopes)

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
Ask the user:

```typescript
ask_user_question({
  questions: [{
    question: `This workflow will modify code.
Create an isolated branch + worktree to avoid conflicts with other workflows?

Branch: pw/{name}/{YYYY-MM-DD}
Dir:    .worktrees/pw-{name}-{date}/`,
    header: "Worktree",
    options: [
      {
        label: "Yes — create isolated worktree (Recommended)",
        description: "Creates separate branch and worktree. Allows multiple parallel workflows without conflicts."
      },
      {
        label: "No — execute in current directory",
        description: "No isolation. Only for 1 workflow at a time in the same repo."
      }
    ]
  }]
})
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

### 6b. Scope Executor Routing

> **Goal system:** See `references/cli-tools/goals.md` for command variants (ordered-execution-goal = /sisyphus-set)

| Scope Type | Executor | Supervision |
|---|---|---|
| `[TYPE] optimization` | `/skill:autoresearch-create` | Metric loop (auto) |
| `[EXECUTOR] autoresearch` | `/skill:autoresearch-create` | Metric loop (auto) |
| Spike with metric | `/skill:autoresearch-create` | Metric loop (auto) |
| `feature` | **ordered-execution-goal** (see goals.md) | `/supervise` with outcome = DoD |
| Refactoring without metric | **ordered-execution-goal** (see goals.md) | `/supervise` with outcome = DoD |
| Investigative spike | **ordered-execution-goal** (see goals.md) | `/supervise` with outcome = DoD |
| Interface brainstorming | **ordered-execution-goal** (see goals.md) | `/supervise` with outcome = DoD |
| `test-unit` | **ordered-execution-goal** (see goals.md) | Testing gates (see below) |
| `test-integration` | **ordered-execution-goal** (see goals.md) | Testing gates (see below) |
| `test-security` | **ordered-execution-goal** (see goals.md) | Testing gates (see below) |
| `test-behavior` | **ordered-execution-goal** (see goals.md) | Testing gates (see below) |

### When starting execution of each scope:

1. **Feature/refactor/spike without metric → ordered-execution-goal + `/supervise`** (see goals.md)
   - Create goal with **ordered-execution-goal** (no discussion, starts immediately)
   - Activate `/supervise` with:
     ```
     /supervise outcome="Execute scope '{scope_name}' per spec-tech.md.
     DoD: {DoD}. AC: {acceptance criteria}. Do not deviate from approved scope."
     ```
   - The supervisor detects deviation and re-centers if the LLM leaves scope

2. **Optimization/spike with metric → `/skill:autoresearch-create`**
   - No supervisor needed (experiment loop is self-supervising via metric)

3. **If blocked:** `pause_goal` with reason documenting the blockage

4. **Scope adjustment:** `/goal-tweak` if scope needs modification during execution

> **Tip:** `/supervise` is especially useful for long scopes where the LLM
> may forget the original objective. Activate WHEN STARTING the scope, not before.

### 6c. Testing Gates (AI-Aware Testing for Software Products)

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

See `skills/cali-product-testing-ai-code/SKILL.md`

## Execution — AUTOMATIC

> **CRITICAL: After Tech Planning approval, execution is MANDATORY.**
> Do NOT ask the user "what to do next". The workflow proceeds automatically.

### Execution Flow

After Plannotator approval on spec-tech_v{N}.md:

1. **Worktree check** (if modifying code in shared repo)
2. **Route to executor** based on scope type:

| Scope Type | Executor | Command |
|------------|----------|--------|
| `feature` | **ordered-execution-goal** (see goals.md) + `/supervise` | see `skills/cali-product-scope-executor/SKILL.md` for instructions |
| `optimization` | `/skill:autoresearch-create` | `/skill:autoresearch-create` |
| `spike` | **ordered-execution-goal** (see goals.md) + `/supervise` | see `skills/cali-product-scope-executor/SKILL.md` for instructions |
| `test-*` | **ordered-execution-goal** (see goals.md) + testing gates | see `skills/cali-product-scope-executor/SKILL.md` for instructions |

### Executing Scopes

Run see `skills/cali-product-scope-executor/SKILL.md` for instructions — this routes each scope to its correct executor.

**For feature scopes:**
```bash
/sisyphus-set Scope: [scope-name]
  Objective: {from scope description}
  Done when:
  - [ ] Criterion 1
  - [ ] Criterion 2
/supervise outcome="Execute scope '[scope-name]' per spec-tech.md. DoD: {DoD}. Do not deviate."
```

**For optimization scopes:**
```bash
/skill:autoresearch-create
```

### ⚠️ NEVER ASK

After Tech Planning approval, **DO NOT** ask:
- "Would you like to execute now?"
- "Create ordered-execution-goal?"
- "Review plan first?"
- Any variation of "what would you like to do next"

**The workflow proceeds automatically: Execution → Verification → Delivery Audit.**

### After Execution

After completing all scopes:
1. **Do not ask user** what to do next
2. **Automatically proceed** to Verification stage
3. Run the testing protocol per [`verification.md`](./verification.md)
4. After Verification passes, **automatically proceed** to Delivery Audit per `skills/cali-product-delivery-audit/SKILL.md`

> **CRITICAL: After Tech Planning approval, execution is MANDATORY.**
> Do NOT ask the user "what to do next". The workflow proceeds automatically.

### Execution Flow

After Plannotator approval on spec-tech_v{N}.md:

1. **Worktree check** (if modifying code in shared repo)
2. **Route to executor** based on scope type:

| Scope Type | Executor | Command |
|------------|----------|--------|
| `feature` | **ordered-execution-goal** (see goals.md) + `/supervise` | see `skills/cali-product-scope-executor/SKILL.md` for instructions |
| `optimization` | `/skill:autoresearch-create` | `/skill:autoresearch-create` |
| `spike` | **ordered-execution-goal** (see goals.md) + `/supervise` | see `skills/cali-product-scope-executor/SKILL.md` for instructions |
| `test-*` | **ordered-execution-goal** (see goals.md) + testing gates | see `skills/cali-product-scope-executor/SKILL.md` for instructions |

### Executing Scopes

**Run see `skills/cali-product-scope-executor/SKILL.md` for instructions** — this routes each scope to its correct executor.

**For feature scopes:**
```bash
/sisyphus-set Scope: [scope-name]
  Objective: {from scope description}
  Done when:
  - [ ] Criterion 1
  - [ ] Criterion 2
/supervise outcome="Execute scope '[scope-name]' per spec-tech.md. DoD: {DoD}. Do not deviate."
```

**For optimization scopes:**
```bash
/skill:autoresearch-create
```

### ⚠️ NEVER ASK

After Tech Planning approval, **DO NOT** ask:
- "Would you like to execute now?"
- "Create ordered-execution-goal?"
- "Review plan first?"
- Any variation of "what would you like to do next"

**The workflow proceeds automatically: Execution → Verification → Delivery Audit.**

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
