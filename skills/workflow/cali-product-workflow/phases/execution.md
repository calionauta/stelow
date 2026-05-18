## Phase 8: Supervisor + Execution

> **Part of cali-product-workflow** — See [`SKILL.md`](./SKILL.md) for phase sequence, safety rules, and capability reference.

### ⚠️ Activate the supervisor ONLY during execution
**Never activate during Phases 3-7.** The supervisor would re-submit Plannotator.

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

| Scope Type | Metric? | Executor | Supervision |
|---|---|---|---|
| `[TYPE] optimization` | Yes | `/skill:autoresearch-create` | Metric loop (auto) |
| `[EXECUTOR] autoresearch` | Yes | `/skill:autoresearch-create` | Metric loop (auto) |
| Spike with metric | Yes | `/skill:autoresearch-create` | Metric loop (auto) |
| Feature | No | `/sisyphus` (ordered steps) | `/supervise` with outcome = DoD |
| Refactoring without metric | No | `/sisyphus` | `/supervise` with outcome = DoD |
| Investigative spike | No | `/sisyphus` | `/supervise` with outcome = DoD |
| Interface brainstorming | No | `/sisyphus` (5 proposals) | `/supervise` with outcome = DoD |

### When starting execution of each scope:

1. **Feature/refactor/spike without metric → `/sisyphus` + `/supervise`**
   - Create goal with `/sisyphus` (ordered steps, DoD as completion criteria)
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

After tech planning, run `/skill:cali-product-scope-executor`
