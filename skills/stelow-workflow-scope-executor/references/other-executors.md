### Step 4: Execute optimization scopes (acceptance contract + benchmark verify)

For each scope with `[TYPE] optimization`:

**Mark scope as in-progress:** (same bash pattern as Step 3 — update scope status to `'in-progress'`)

1. **Create an optimization goal** via acceptance contract (see `cli-tools/goals.md` → Optimization Goals for patterns, benchmark verify commands, and iteration loops).

2. **Set a stopping condition:**
   - If metric target is defined in the plan: stop when target is met
   - If no target: run for a reasonable number of iterations (5-10) or until improvements plateau

3. **When optimization completes**, run parallel code review (see `cli-tools/subagents.md`)
4. **DoD verification** (see Step 7)
5. **Update scope tracking** — set scope status to `'completed'` (or `'escalated'` on failure) in `stelow.json` (same bash pattern as Step 3)

### Step 5: Execute spike scopes (delegate recon + research)

For each scope with `[TYPE] spike`:

**Mark scope as in-progress:** (same bash pattern as Step 3 — update scope status to `'in-progress'`)

1. **Run parallel investigation via subagents** (see `cli-tools/subagents.md`):
   - **recon**: investigate existing codebase for the objective — find relevant files, patterns, constraints
   - **research**: best practices and solutions for the objective — concrete options with pros/cons
   Concurrency: 2, context: fresh
2. **Consolidate findings** into a recommendation document at the spikes subdirectory
3. **If the spike reveals a code change is needed**, optionally run parallel review
4. **DoD verification** (see Step 7)

### Step 6: Handle dependencies between scopes

- Scopes without dependencies can run **in parallel** (up to reasonable concurrency)
- If a scope depends on another, wait for it to complete first
- Use the harness background option for parallel phases and check status periodically
- After all scopes in a phase complete, proceed to the next phase

### Step 7: Compliance Check

Before generating the final report, cross-reference the original plan (spec-tech.md) with what was executed:

1. **Coverage:** was every scope in spec-tech.md executed?
   - If a scope was skipped: document the reason
   - If extra scopes were created: document the justification
2. **DoD:** did each executed scope meet its Definition of Done?
   - If not: document the gap
3. **Principles:** read `stelow-workflow-coding-standards` (skill)
   and check if principles were followed in the generated code
   - If violations were detected by parallel-review: were they fixed?
4. **Verification result:** APPROVED | CAVEATS | REJECTED
