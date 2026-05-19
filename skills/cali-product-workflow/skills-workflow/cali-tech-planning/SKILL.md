---
name: cali-tech-planning
description: >
  [Cali] Technical planning and scope sequencing skill. Generates typed scopes
  (feature/optimization/spike), sequences them, and creates /sisyphus goals.
  Part of cali-product-workflow but can be used standalone.
---

# Tech Planning Sequencing

> **Tools:** See `references/pi-tools/subagents.md` for subagent patterns, `references/pi-tools/goals.md` for goal commands.

This skill executes the Tech Planning phase. It can be run:
1. **Standalone:** `/skill:cali-tech-planning` — after Shape Up and Critique
2. **Via Orchestrator:** Called by `/skill:cali-product-workflow`

## Prerequisites

**Security check:** Read the YAML frontmatter of spec-product.md:
```bash
head -10 spec-product_{v}.md | grep "approved:"
```
- ✅ `approved: true` → proceed
- ❌ No `approved: true` → **GO BACK to Phase 6. Do not proceed.**

This check is **deterministic** — does not depend on memory.

## References Index

Read the `references/` files to guide the process:

| File | Covers | When to read |
|---|---|---|
| `references/TECH-CONTEXT.md` | Tech planning context, prerequisites, workflow position | **Before starting** — sets planning context |
| `references/SCOPES-AND-SEQUENCING.md` | Scope types (feature/optimization/spike), executor routing, sequencing principles | **During generation** — defines scope structure |
| `references/TECH-OUTPUT.md` | Tech plan output format, frontmatter, receipts | **After generation** — formats output |
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

### 5b. Conditional Review Gate

**If standalone (no Shape Up/Interface):** use `references/pi-tools/plannotator.md` for the Plannotator command.

**If post-Shape-Up:** the gate already ran in Phase 6 — skip this step.

### 5c. Goal Generation (Step 9)

After tech plan approval, convert each scope into a `/sisyphus` goal with DoD as completion criteria:

**For each scope in the approved spec-tech.md:**

```typescript
/sisyphus Scope: {scope_name}

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

**Optimization/spike scopes with metrics → `/skill:autoresearch-create`**
(they become experiment loops, not goals)

**Rules:**
- Scopes with dependencies: create goal AFTER the dependency is complete
- Use `pause_goal` with reason if a scope gets blocked
- `/goal-tweak` for scope adjustments during execution

## Output

Tech plan is saved to:
```
.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_{v}.md
```

## Related Skills

- **cali-shape-up**: Produces the shaped proposal
- **cali-plan-critique**: Reviews the proposal before tech planning
- **cali-product-workflow** (orchestrator): Coordinates this skill with execution

## Environment Adaptation

If a tool is unavailable, check:
`../../../cali-product-workflow/references/pi-tools/`