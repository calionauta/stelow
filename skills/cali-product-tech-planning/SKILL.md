---
name: cali-product-tech-planning
description: >
  [Cali] Technical planning and scope sequencing skill. Generates typed scopes
  (feature/optimization/spike + test-*), sequences them, and creates goals (see references/cli-tools/goals.md).
  For software products, also generates testing-strategy.md via cali-product-testing-ai-code.
  Part of cali-product-workflow but can be used standalone.
metadata:
  frequency: weekly
  category: product
  context-cost: low
---

# Tech Planning Sequencing

> **Tools:** See `references/cli-tools/subagents.md` for subagent patterns, `references/cli-tools/goals.md` for goal commands.

This skill executes the Tech Planning phase.

## How to Load

This skill is **bundled with cali-product-workflow** — there is no standalone `/skill:` command.

### Via Orchestrator (recommended)
The orchestrator reads this file directly when needed.

### Standalone
Follow the instructions inline below.

## Prerequisites

**Security check:** Read the YAML frontmatter of spec-product.md:
```bash
head -10 spec-product_{v}.md | grep "approved:"
```
- ✅ `approved: true` → proceed
- ❌ No `approved: true` → **GO BACK to Gate stage (Plannotator visual review). Do not proceed.**

This check is **deterministic** — does not depend on memory.

### AI-Aware Testing Check

**For software products**, also check `product_type`:
```bash
head -10 spec-product_{v}.md | grep "product_type:"
```
- ✅ `product_type: software` or `product_type: hybrid` → activate cali-product-testing-ai-code
- ❌ `product_type: service` → skip testing strategy

## References Index

Read the `references/` files to guide the process:

| File | Covers | When to read |
|---|---|---|
| `references/tech-context.md` | Tech planning context, prerequisites, workflow position | **Before starting** — sets planning context |
| `references/scopes-and-sequencing.md` | Scope types (feature/optimization/spike + test-*), executor routing, sequencing principles | **During generation** — defines scope structure |
| `references/tech-output.md` | Tech plan output format, frontmatter, receipts | **After generation** — formats output |
| `references/generation-principles.md` | Generation principles, constraints, quality standards | **During generation** — guides implementation |

## Process

### 7a. Scope Generation

Use the references above to generate technical scopes.

Delegate to a planner subagent (see `references/cli-tools/subagents.md`):
- Agent: `planner`
- Task: generate typed scopes (feature/optimization/spike) from the approved spec-product.md
- Follow steps: strategic stability check → codebase awareness → risk analysis → spike identification → scope definition → sequencing → DoD + ACs → formatting
- Output: `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_{v}.md`
- Input: `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md`

**⚠️ FALLBACK — if subagent fails or is unavailable:**
Generate spec-tech.md INLINE using the same process. Read the references files
(`tech-context.md`, `scopes-and-sequencing.md`, `generation-principles.md`, `tech-output.md`)
and produce the spec-tech artifact directly in the current context.

### 7b. AI-Aware Testing Strategy (Software Products Only)

**If `product_type: software` or `product_type: hybrid`**:

1. **Generate testing-strategy.md via subagent:**

   Delegate to a testing-strategy subagent (see `references/cli-tools/subagents.md`):
   - Agent: `cali-product-testing-ai-code` or equivalent
   - Input: spec-product.md frontmatter with `product_type: software`
   - Output: `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/testing-strategy.md`
   - Content: mutation score targets (70/50/30%), tech stack detection, CI/CD gates, anti-patterns

   **⚠️ FALLBACK — if subagent fails or is unavailable (API key missing, agent not found):**
   Generate testing-strategy.md INLINE. Read `skills/cali-product-testing-ai-code/SKILL.md`
   and produce the testing-strategy.md artifact directly in the current context.
   Do NOT skip — the testing strategy gates are required for execution.

2. **Add test-* scopes to spec-tech.md:**

Based on testing-strategy.md, add scopes for:
- `test-unit`: Unit tests for critical business logic (TDD recommended)
- `test-integration`: Integration tests for DB, APIs, external services
- `test-security`: Security scanning gates
- `test-mutation`: Mutation testing validation

**Note on TDD:** Research shows TDD alone is insufficient for AI-generated code.
- Use TDD for critical business logic (isolated, deterministic)
- Use Test-After + Mutation for standard paths
- Never use same AI for both code AND test generation

### 5b. Tech Planning Review Gate

**⚠️ MANDATORY — ALWAYS run gate. Never skip.**

Spec-tech is a distinct artifact: scopes, sequencing, dependencies, DoDs, and testing strategy
were never reviewed visually in earlier phases. Prior gates (spec-product, interfaces) do NOT
cover spec-tech content.

**Run Plannotator gate for the tech plan BEFORE generating goals:**

```bash
[use the Plannotator gate command — see `references/cli-tools/plannotator.md`]
```

See `references/cli-tools/plannotator.md` for command format, after-approval workflow, and frozen file rules.

| Scenario | Action |
|---------|--------|
| **Always** | Run Plannotator gate for spec-tech |
| Plannotator unavailable | Fallback: use `ask_user_question` to present scopes, sequencing, DoDs, and ask for explicit approval |

**If approved:**
1. Stamp `approved: true, approved_at: ...` in spec-tech frontmatter
2. Create receipt in `approvals/` directory
3. Proceed to Goal Generation

**If user requests changes:**
1. Adjust the tech plan
2. Re-submit via the Plannotator gate command (see `references/cli-tools/plannotator.md`)
3. Repeat until approved

### 5c. Goal Generation (Step 9)

After tech plan approval, convert each scope into an **ordered-execution-goal**
(see `references/cli-tools/goals.md`, `sisyphus-set` variant). Goals are mandatory —
never use simple todo lists as a substitute; goals carry DoD, ACs, and dependencies
that todo items cannot express.

**For each feature/test scope in the approved spec-tech.md:**

Create an ordered-execution-goal (see `references/cli-tools/goals.md`):

```text
Objective: {scope name}
Steps:
1. {step 1}
   Done: {criterion}
2. {step 2}
   Done: {criterion}
...

DoD: {scope DoD}
AC: {acceptance criteria}
Deps: {scope dependencies}
```

**Optimization scopes with metrics:**
These become experiment-loops (see `references/cli-tools/autoresearch.md`), not goals.

**Rules:**
- Scopes with dependencies: create goal AFTER the dependency is complete
- Use the goal pause command (see `references/cli-tools/goals.md`) if a scope gets blocked
- Use the goal tweak command (see `references/cli-tools/goals.md`) for scope adjustments during execution
- ⚠️ **Never substitute todo items for goals** — goals carry structured DoDs, ACs, and dependency tracking

## Output

Tech plan is saved to:
```
.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_{v}.md
```

## After Tech Planning — EXECUTE AUTOMATICALLY

**DO NOT ask user what to do next. Execution is automatic.**

### ⛔ STOP — Mandatory Scope Executor Routing

**Before implementing ANY scope, route through the scope executor.**
The scope executor determines the correct tool and execution mode for each scope type.
Do NOT start implementing scopes directly — always go through scope executor first.

**Step 1: Load the scope executor skill**
```text
Read skills/cali-product-scope-executor/SKILL.md for routing rules.
```

**Step 2: Route each scope by type:**

| Scope type | Route to |
|------------|----------|
| `feature` | ordered-execution-goal (see `references/cli-tools/goals.md`) + supervision (see `references/cli-tools/supervise.md`) |
| `optimization` | experiment-loop (see `references/cli-tools/autoresearch.md`) |
| `spike` | scout + researcher (see `references/cli-tools/subagents.md`) |
| `test-*` | ordered-execution-goal (see `references/cli-tools/goals.md`) with testing gates |

See `stages/execution.md` for full execution flow.

### ⚠️ DoD Verification — Mandatory Before Completion

After executing a scope, **before marking it complete**, verify EVERY item in the DoD
and acceptance criteria:

1. Read the DoD and ACs from spec-tech.md for this scope
2. Verify each item with concrete evidence (build output, test results, file existence)
3. **Only mark complete if ALL DoD items and ACs pass**
4. If any DoD item fails → scope is NOT complete, fix the gap
5. If a scope has manual test steps in its DoD → EXECUTE them, do not skip

Failure to verify DoD = scope is still in_progress. The goal system enforces this.

### Testing Gates (test-* scopes)

For test-* scopes, the execution includes hard blocks:
- **test-mutation**: mutation_score >= target → BLOCK if below
- **test-security**: security_findings == 0 on critical paths → BLOCK if found
- **test-integration**: flaky_rate < 5% → WARN if above

See `skills/cali-product-testing-ai-code/SKILL.md`

## Related Skills

- **cali-product-shape-up**: Produces the shaped proposal
- **cali-product-critique**: Reviews the proposal before tech planning
- **cali-product-workflow** (orchestrator): Coordinates this skill with execution

## Environment Adaptation

If a tool is unavailable, check:
`../cali-product-workflow/references/cli-tools/`