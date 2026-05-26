---
name: cali-product-tech-planning
description: >
  [Cali] Technical planning and scope sequencing skill. Generates typed scopes
  (feature/optimization/spike + test-*), sequences them, and creates goals (see references/cli-tools/goals.md).
  For software products, also generates testing-strategy.md via cali-product-testing-ai-code.
  Part of cali-product-workflow but can be used standalone.
---

# Tech Planning Sequencing

> **Tools:** See `references/cli-tools/subagents.md` for subagent patterns, `references/cli-tools/goals.md` for goal commands.

This skill executes the Tech Planning phase.

## How to Load

This skill is **bundled with cali-product-workflow** — there is no standalone `/skill:` command.

### Via Orchestrator (recommended)
The orchestrator reads this file directly when needed.

### Standalone
To run standalone, read `cali-product-tech-planning/SKILL.md` and follow the instructions inline.

## Prerequisites

**Security check:** Read the YAML frontmatter of spec-product.md:
```bash
head -10 spec-product_{v}.md | grep "approved:"
```
- ✅ `approved: true` → proceed
- ❌ No `approved: true` → **GO BACK to Phase 6. Do not proceed.**

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

Use the references above to generate technical scopes:

```typescript
subagent({
  agent: "planner",
  task: `Generate tech scopes for the approved spec-product.md using references/.

1. Check strategic stability (Step 0)
2. Codebase awareness check (Step 1)
3. Technical risk analysis (Step 2)
4. Identify spikes (Step 3)
5. Define typed scopes: feature | optimization | spike (Step 4)
6. Sequence (riskiest-first or ui-first) (Step 5)
7. Detail each scope with DoD + acceptance criteria (Step 6)
8. Format per output-format.md (Step 7)

Output: .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_{v}.md
Input: .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md`,
  output: ".cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_{v}.md"
})
```

Output: `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_{v}.md`
Input: `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md`

### 7b. AI-Aware Testing Strategy (Software Products Only)

**If `product_type: software` or `product_type: hybrid`**:

1. **Generate testing-strategy.md:**
```typescript
subagent({
  agent: "cali-product-testing-ai-code",
  task: `Generate testing strategy for software product.
Input: spec-product.md (frontmatter with product_type: software)
Output: .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/testing-strategy.md

Include:
- Mutation score targets (70/50/30%)
- Tech stack detection
- CI/CD gates (hard blocks)
- Anti-patterns (over-mocking, 100% coverage)`,
  output: ".cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/testing-strategy.md"
})
```

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

After tech plan approval, convert each scope into a goal (see `references/cli-tools/goals.md`) with DoD as completion criteria:

**For each scope in the approved spec-tech.md:**

```typescript
[goal command — see `references/cli-tools/goals.md`]

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

**Optimization/spike scopes with metrics → `**experiment-loop** (see `references/cli-tools/autoresearch.md`)`**
(they become experiment loops, not goals)

**Rules:**
- Scopes with dependencies: create goal AFTER the dependency is complete
- Use the goal pause command (see `references/cli-tools/goals.md`) if a scope gets blocked
- Use the goal tweak command (see `references/cli-tools/goals.md`) for scope adjustments during execution

## Output

Tech plan is saved to:
```
.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_{v}.md
```

## After Tech Planning — EXECUTE AUTOMATICALLY

**DO NOT ask user what to do next. Execution is automatic.**

After Plannotator approval on spec-tech_v{N}.md:
1. Run `read `skills/cali-product-scope-executor/SKILL.md`` for scope routing
2. Execute scopes based on type:
   - `feature` → goal (see `references/cli-tools/goals.md`) + supervise (see `references/cli-tools/supervise.md`)
   - `optimization` → `**experiment-loop** (see `references/cli-tools/autoresearch.md`)`
   - `test-unit`, `test-integration`, `test-security`, `test-behavior` → goal (see `references/cli-tools/goals.md`) with testing gates

See `stages/execution.md` for full execution flow.

### Testing Gates (test-* scopes)

For test-* scopes, the execution includes hard blocks:
- **test-mutation**: mutation_score >= target → BLOCK if below
- **test-security**: security_findings == 0 on critical paths → BLOCK if found
- **test-integration**: flaky_rate < 5% → WARN if above

See `skills/cali-product-testing-ai-code/SKILL.md`

## Related Skills

- **cali-product-shape-up**: Produces the shaped proposal
- **cali-product-plan-critique**: Reviews the proposal before tech planning
- **cali-product-workflow** (orchestrator): Coordinates this skill with execution

## Environment Adaptation

If a tool is unavailable, check:
`../cali-product-workflow/references/cli-tools/`