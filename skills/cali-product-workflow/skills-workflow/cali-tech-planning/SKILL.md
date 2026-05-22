---
name: cali-tech-planning
description: >
  [Cali] Technical planning and scope sequencing skill. Generates typed scopes
  (feature/optimization/spike + test-*), sequences them, and creates goals (see references/cli-tools/goals.md).
  For software products, also generates testing-strategy.md via cali-testing-ai-code.
  Part of cali-product-workflow but can be used standalone.

  Trigger keywords: tech planning, scope generation, typed scopes, feature spike optimization,
  sequence scopes, technical plan, spec-tech

  NOT for: direct execution (use cali-product-scope-executor instead)
---

# Tech Planning Sequencing

## Goal

Generate a technical plan from an approved spec-product.md, including:
- **Typed scopes** (feature/optimization/spike + test-*)
- **Sequenced execution order**
- **Definition of Done + Acceptance criteria** per scope

## When to Use

Activate when:
- User wants technical planning from a shaped proposal
- Generating scopes from spec-product.md
- Sequencing execution plan
- Tech planning phase of cali-product-workflow

**Do NOT activate for:**
- Direct execution (use cali-product-scope-executor)
- Debugging existing code

## Prerequisites

**Security check:** Read the YAML frontmatter of spec-product.md:
```bash
head -10 spec-product_{v}.md | grep "approved:"
```
- ✅ `approved: true` → proceed
- ❌ No `approved: true` → **GO BACK to Phase 6. Do not proceed.**

This check is **deterministic** — does not depend on memory.

### AI-Aware Testing Check

If `product_type: software` or `product_type: hybrid` in frontmatter:
- Activate `/skill:cali-testing-ai-code` to generate testing-strategy.md
- Add `test-*` scope types to spec-tech.md
- See `skills-execution/cali-testing-ai-code/SKILL.md`

## Process

### 7a. Scope Generation

Read the `references/` files to guide the process:

| File | Covers | When to read |
|---|---|---|
| `references/tech-context.md` | Tech planning context, prerequisites, workflow position | **Before starting** — sets planning context |
| `references/scopes-and-sequencing.md` | Scope types (feature/optimization/spike + test-*), executor routing, sequencing principles | **During generation** — defines scope structure |
| `references/tech-output.md` | Tech plan output format, frontmatter, receipts | **After generation** — formats output |
| `references/generation-principles.md` | Generation principles, constraints, quality standards | **During generation** — guides implementation |

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

**Output:** `spec-tech_{v}.md`
**Input:** `spec-product_{v}.md`

### 7b. AI-Aware Testing Strategy (Software Products Only)

**Trigger:** `product_type: software` or `product_type: hybrid` in spec-product.md frontmatter.

Run `/skill:cali-testing-ai-code` to generate `testing-strategy.md`.

This skill:
- Generates mutation-based testing plans
- Defines security gates
- Sets coverage targets

See `skills-execution/cali-testing-ai-code/SKILL.md` for full documentation.

## Scope Types

| Type | Executor | Use Case |
|------|----------|----------|
| `feature` | `/sisyphus` + `/supervise` | Standard features |
| `optimization` | `autoresearch-create` | Performance tuning |
| `spike` | `/sisyphus` + `/supervise` | Research/uncertainty |
| `test-*` | `/sisyphus` + testing gates | Test coverage |

### Executor Override (`[EXECUTOR]`)

**Optional.** When present, overrides the default routing by type.

```
[SCOPE-4]
[TYPE] feature
[EXECUTOR] autoresearch
[METRIC] Average cyclomatic complexity < 10 (lower is better)
```

**Rule: when to add `[EXECUTOR] autoresearch`**
- Scope has measurable metric (e.g., perf, bundle size, test coverage)
- Metric can be auto-benchmarked
- Optimization target is clear

## Output Format

This skill produces:
- **spec-tech_{v}.md** — Technical plan with typed scopes
- **testing-strategy.md** — AI-aware testing strategy (software products only)

See `references/tech-output.md` for the expected output format.

Tech plan must contain:
- **Scopes** — Typed, sequenced, with DoD + acceptance criteria
- **Dependencies** — Between scopes
- **Risks** — Technical risks identified
- **Receipt** — Plannotator approval record

## Gotchas

1. **Approval check** — Always verify `approved: true` before generating scopes
2. **AI-aware testing** — Only for software/hybrid products, not for non-software
3. **Executor routing** — Use correct executor per scope type
4. **Sequencing** — Riskiest-first or UI-first, not alphabetical
5. **Version tracking** — spec-tech_{v} must match spec-product_{v}

## Testing

### Trigger Tests
- "Generate tech plan" → should trigger
- "Create scopes from spec" → should trigger
- "Sequence the execution" → should trigger
- "Fix the auth bug" → should NOT trigger

### Output Tests
- spec-tech.md contains typed scopes (feature/optimization/spike)
- Each scope has DoD + acceptance criteria
- Scopes are sequenced (not alphabetical)
- Testing strategy exists for software products

## Related Skills

- **cali-shape-up**: Produces the spec-product.md that feeds this planning
- **cali-product-workflow**: Coordinates this skill with other phases
- **cali-product-scope-executor**: Executes the scopes generated here

## Environment Adaptation

If a tool is unavailable, check:
`../../../cali-product-workflow/references/cli-tools/`