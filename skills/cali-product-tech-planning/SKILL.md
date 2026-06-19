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

### Via Orchestrator (recommended)
The orchestrator reads this file directly when needed.

### Standalone
This skill works standalone. Use the Input Detection section below to tell the skill what technical context to plan from. Follow the instructions inline.

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
| `cali-product-coding-standards` (skill) | Coding standards + Datastar framework philosophy | **During generation** — guides implementation |

## Process

### tech:5 — Discover Stack

**Before any scopes are generated**, determine the tech stack.
Stack is a technical decision — owned by Tech Planning, not Shape Up.
Shape Up only takes "tech hints" (mobile/web/API), final stack is here.

**Detect from existing project:**
```bash
STACK_SOURCE=""
if [ -f "go.mod" ]; then
  STACK_SOURCE="existing:go"
  MODULE=$(head -1 go.mod | awk '{print $2}')
elif [ -f "package.json" ]; then
  STACK_SOURCE="existing:node"
  NODE_DEPS=$(jq -r '.dependencies? // {} | keys[]' package.json 2>/dev/null | head -10)
  HAS_NEXT=$(echo "$NODE_DEPS" | grep -i next || echo "")
  HAS_REACT=$(echo "$NODE_DEPS" | grep -i react || echo "")
elif [ -f "Cargo.toml" ]; then
  STACK_SOURCE="existing:rust"
elif [ -f "Gemfile" ]; then
  STACK_SOURCE="existing:ruby"
elif [ -f "requirements.txt" ] || [ -f "pyproject.toml" ]; then
  STACK_SOURCE="existing:python"
elif [ -f "composer.json" ]; then
  STACK_SOURCE="existing:php"
elif [ -f "pubspec.yaml" ]; then
  STACK_SOURCE="existing:flutter"
elif [ -f "CMakeLists.txt" ]; then
  STACK_SOURCE="existing:cpp"
fi
```

**If existing project detected (`$STACK_SOURCE` is set):**
- Stack is inferred. No questions asked.
- To get updated docs for the established stack, `ctx7` (see below) is available
  during execution. Not required now — noted for reference.

**If new project (no existing source):**

Use `web_search` in parallel to research current best options:
```
Parallel queries:
  A: "best web tech stack 2026 production ready"
  B: "supabase vs pocketbase 2026 comparison pricing"
  C: "react vs svelte vs solid 2026 production adoption"
  D: "[derived from context] best stack for {domain}"
```

Consolidate into a recommendation with alternatives. Use `ask_user_question`
(see `references/cli-tools/structured-question.md`) to present:

> **Recommendation:** {chosen stack} (Recommended)
> **Alternatives:** {alt1} | {alt2}
> **Justification:** {why this fits the product}

**If user confirms:** proceed.
**If user picks alternative:** use their choice.
**If user customizes:** note their choice, proceed.

**Save stack to spec-tech frontmatter:**
```yaml
tech_stack:
  primary: "go 1.26 + templ + datastar"
  database: "sqlite (turso)"
  deployment: "docker"
  stack_source: "$(STACK_SOURCE:-"new:web_search")"
```

> **ctx7 — doc lookup during execution:** After stack is confirmed,
> `npx ctx7 library <library>` resolves lib to ctx7 ID, then
> `npx ctx7 docs <id> "<query>"` fetches version-specific docs.
> Use during `execution` when writing code against specific APIs.
> Not needed during planning.
>
> **npx skills find — prompt templates during execution:**
> `npx skills find {stack}` discovers skills/prompts for the chosen tech.
> `npx skills use <package>@<skill>` generates a prompt inline.
> Use during `execution` phase, not planning phase.

---

### planning:10 — Scope Generation

Use the references above to generate technical scopes.

Delegate to a planner subagent (see `references/cli-tools/subagents.md`):
- Agent: `planner`
- Task: generate typed scopes (feature/optimization/spike) from the approved spec-product.md
- Follow steps: strategic stability check → codebase awareness → risk analysis → spike identification → scope definition → sequencing → DoD + ACs → formatting
- Output: `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_{v}.md`
- Input: `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md`

#### planning:10.10 — Output Validation Guard

After the subagent writes spec-tech.md, validate every scope has required fields:

```bash
SPEC_TECH=".cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_{v}.md"
VALID=true

# Check each scope for required fields
for SCOPE_LINE in $(grep -n "^### " "$SPEC_TECH" | sed 's/:.*//'); do
  # Each scope must have TYPE, DoD, and AC
  tail -n +$SCOPE_LINE "$SPEC_TECH" | head -50 | grep -q "TYPE:" || {
    echo "VALIDATION_FAILED: scope at line $SCOPE_LINE missing TYPE"; VALID=false;
  }
  tail -n +$SCOPE_LINE "$SPEC_TECH" | head -50 | grep -q -E "(DoD|Definition of Done)" || {
    echo "VALIDATION_FAILED: scope at line $SCOPE_LINE missing DoD"; VALID=false;
  }
  tail -n +$SCOPE_LINE "$SPEC_TECH" | head -50 | grep -q -E "(AC|Acceptance Criteria|Critério)" || {
    echo "VALIDATION_FAILED: scope at line $SCOPE_LINE missing AC"; VALID=false;
  }
done

# Check for circular dependencies (>5 levels of nesting = probable error)
if grep -q "depends_on.*depends_on.*depends_on.*depends_on.*depends_on" "$SPEC_TECH" 2>/dev/null; then
  echo "VALIDATION_WARN: possible circular or deeply nested dependencies"
fi

if [ "$VALID" = false ]; then
  echo "Required scope fields missing. Regenerating with validation errors flagged..."
  # Feed validation errors back to planner and regenerate once
fi

# Check appetite violation: scope count vs appetite
APPETITE=$(grep -oP '^appetite:\s*\K\S+' .cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "Focused")
SCOPE_COUNT=$(grep -c "^### " "$SPEC_TECH")

# Appetite boundary check: scope count should stay within appetite
# PoC ≤ 1, Focused ≤ 5, Comprehensive > 5
case "$APPETITE" in
  PoC) [ "$SCOPE_COUNT" -gt 1 ] && echo "APPETITE_VIOLATION: PoC appetite but $SCOPE_COUNT scopes. Consolidate or split into multiple cycles." ;;
  Focused)  [ "$SCOPE_COUNT" -gt 5 ] && echo "APPETITE_VIOLATION: Focused appetite but $SCOPE_COUNT scopes. Consider reducing scope." ;;
  Comprehensive)  ;;  # Comprehensive has no upper limit by scope count alone
esac
```

> **Rationale:** Scopes missing TYPE, DoD, or ACs will fail at Execution time.
> Catching this at planning time saves wasted executor cycles.

**⚠️ FALLBACK — if subagent fails or is unavailable:**
Generate spec-tech.md INLINE using the same process. Read the references files
(`tech-context.md`, `scopes-and-sequencing.md`, `tech-output.md`)
and read `cali-product-coding-standards` for Datastar framework philosophy,
then produce the spec-tech artifact directly in the current context.

### planning:20 — AI-Aware Testing Strategy (Software Only)

**If `product_type: software` or `product_type: hybrid`**:

1. **Generate testing-strategy.md via subagent:**

   Delegate to a testing-strategy subagent (see `references/cli-tools/subagents.md`):
   - Agent: `cali-product-testing-ai-code` or equivalent
   - Input: spec-product.md frontmatter with `product_type: software`
   - Output: `.cali-product-workflow/{YYYY-MM-DD}/{_dir}/plans/testing-strategy.md`
   - Content: mutation score targets (70/50/30%), tech stack detection, CI/CD gates, anti-patterns

   **⚠️ FALLBACK — if subagent fails or is unavailable (API key missing, agent not found):**
   Generate testing-strategy.md INLINE. Read the `cali-product-testing-ai-code` skill
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

### planning:30 — Tech Planning Review Gate

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

### planning:40 — Goal Generation

After tech plan approval, convert each scope into a **goal**
using the goals tool (see `references/cli-tools/goals.md`). Goals are mandatory —
never use simple todo lists as a substitute; goals carry DoD, ACs, dependencies,
verification commands, and evidence types that todo items cannot express.

**For each feature/test scope in the approved spec-tech.md:**

Create a goal using the goals tool (see `references/cli-tools/goals.md`).
The goals reference documents acceptance patterns, evidence types, verify commands,
and CLI fallbacks.

**Optimization scopes with metrics:**
These become optimization goals using the goals tool
(see `references/cli-tools/goals.md` → Optimization Goals section).

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

**planning:50.10 — Load the scope executor skill**
```text
Read the cali-product-scope-executor skill for routing rules.
```

**planning:50.20 — Route each scope by type**

| Scope type | Route to |
|------------|----------|
| `feature` | worker + iteration loop (see scope-executor Step 3 — implement → verify → review → quality, repeat) + supervision (see `references/cli-tools/supervise.md`) |
| `optimization` | subagent + acceptance with benchmark verify (see `references/cli-tools/goals.md` → Optimization Goals) |
| `spike` | scout + researcher (see `references/cli-tools/subagents.md`) |
| `test-*` | subagent + acceptance (see `references/cli-tools/goals.md`) with testing gates |

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

See the `cali-product-testing-ai-code` skill

## Related Skills

- **cali-product-shape-up**: Produces the shaped proposal
- **cali-product-plan-critique**: Reviews the proposal before tech planning
- **cali-product-workflow** (orchestrator): Coordinates this skill with execution

## Input Detection (Standalone Mode)

When called outside the workflow with no pre-approved spec-product.md:

```
Input:
  ├── User provided a spec-product*.md path?
  │   └→ Read it and extract scope, requirements, product_type
  ├── User described the feature verbally?
  │   └→ Extract: what needs to be built, tech stack, constraints
  └── No structured input?
      └→ Ask: "What software feature do you want to plan?
         Describe the requirements, tech stack, and any non-functional
         constraints (performance, security, scale)."
```

Note: Standalone mode **requires** the `product_type` check — ask the user if it's
software, service, or hybrid so the AI-Aware Testing Strategy can activate correctly.

## Environment Adaptation

If a tool is unavailable, check:
`references/cli-tools/`