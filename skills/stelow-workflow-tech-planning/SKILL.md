---
name: stelow-workflow-tech-planning
description: >
  [stelow] Technical planning and scope sequencing skill. Generates typed scopes
  (feature/optimization/spike + test-*), sequences them, and creates goals (see references/cli-tools/goals.md).
  For software products, also generates testing-strategy.md via stelow-workflow-testing-ai-code.
  Part of stelow but can be used standalone.
metadata:
  frequency: weekly
  category: workflow
  context-cost: low
  author: calionauta
  author-url: https://github.com/calionauta
---

# Tech Planning Sequencing

> **Tools:** See `../stelow-workflow-orchestrator/references/cli-tools/subagents.md` for subagent patterns, `../stelow-workflow-orchestrator/references/cli-tools/goals.md` for goal commands.

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
- ❌ No `approved: true` → **GO BACK to Gate stage (visual review visual review). Do not proceed.**

This check is **deterministic** — does not depend on memory.

### AI-Aware Testing Check

**For software products**, also check `product_type`:
```bash
head -10 spec-product_{v}.md | grep "product_type:"
```
- ✅ `product_type: software` or `product_type: hybrid` → activate stelow-workflow-testing-ai-code
- ❌ `product_type: service` → skip testing strategy

## References Index

Read the `references/` files to guide the process:

| File | Covers | When to read |
|---|---|---|
| `references/tech-context.md` | Tech planning context, prerequisites, workflow position | **Before starting** — sets planning context |
| `references/scopes-and-sequencing.md` | Scope types (feature/optimization/spike + test-*), executor routing, sequencing principles | **During generation** — defines scope structure |
| `references/tech-output.md` | Tech plan output format, frontmatter, receipts | **After generation** — formats output |
| `stelow-workflow-coding-standards` (skill) | Universal coding standards (KISS, DRY, LoB, SoC, Fail Fast, YAGNI) | **During generation** — guides implementation |

## How scopes & tasks flow between planning and execution

**The split (Shape Up hill chart collapsed into scopes):**

| Layer | Owned by | Lifetime | Purpose |
|---|---|---|---|
| **Scope** | `stelow-workflow-tech-planning` (this skill) | Workflow lifetime (stelow.json) | Atomic delivery unit. Appetite ceiling: Lean ≤2, Core ≤5, Complete ~10. Cannot be created during execution — must be planned. |
| **Task** | `stelow-workflow-scope-executor` Step 3e-ter (runtime) | Scope lifetime (`wf.scopes[i].tasks`) | Sub-item checklist inside a scope. Seeds from spec-tech.md table; can be added during execution as `source: 'discovered'`. |

**At planning time (this skill):**

- The scope body in `spec-tech_{v}.md` contains a Tasks table — the initial hill-chart breakdown per scope. This table is the **input** to runtime tracking.
- You do NOT add a `tasks: []` field to `wf.scopes[i]` at planning time. The executor parses the table at scope start and seeds the field.

**At execution time (scope-executor Step 3e-ter):**

- Scope start: parse the Tasks table, seed each row as `source: 'planned', status: 'pending'`.
- During execution: when the child LLM discovers new work (test flake, missing index, refactor needed for an AC), append a task with `source: 'discovered', note: <trigger>`.
- At scope close: the final `tasks[]` snapshot is the executable proof of what actually happened. `discovered_tasks_count` aggregates the count.

**Why this split:** scopes are committed up front (Shape Up's "you can change the hill chart but not the scope shape"). Tasks emerge from reality — they're the visible, low-cost-by-design artifacts of "what we learned by building".

**Rule:** if a discovered task grows large enough to be its own delivery unit, **escalate it as a new scope**. Do not bloat the current scope. The hill chart's job is to make scope size honest, not to encourage scope creep in disguise.

**See also:**
- `../stelow-workflow-scope-executor/SKILL.md#3e-ter` — task seeding, append, mark-done.
- `references/scopes-and-sequencing.md#Scope Detail Template` — the markdown table format.

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
- To get updated docs for the established stack, `doc-search` (see below) is available
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
(see `../stelow-workflow-orchestrator/references/cli-tools/ask.md`) to present:

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

> **doc-search + stack-skills:** See `references/cli-tools/doc-search.md` and
> `references/cli-tools/stack-skills.md` for usage during execution phase.

---

### planning:10 — Scope Generation

Generate typed scopes (feature/optimization/spike/test-*) with dependencies,
tasks table, target files and DoD/ACs from the approved spec-product.md.
Full generation flow, brownfield detection, validation guards and formatting:
`references/scope-generation.md`.

### planning:15 — Bidirectional Alignment Check (mode-gated)

Compare tech plan against product spec; resolve misalignment per `review_mode`
(auto-update vs ask). Full check flow: `references/alignment-check.md`.

### planning:20 — AI-Aware Testing Strategy (Software Only)

**If `product_type: software` or `product_type: hybrid`**:

1. **Generate testing-strategy.md via subagent:**

   Delegate to a testing-strategy subagent (see `../stelow-workflow-orchestrator/references/cli-tools/subagents.md`):
   - Agent: `stelow-workflow-testing-ai-code` or equivalent
   - Input: spec-product.md frontmatter with `product_type: software`
   - Output: `.stelow/{YYYY-MM-DD}/{_dir}/plans/testing-strategy.md`
   - Content: risk-based coverage targets, tech stack detection, CI/CD gates, anti-patterns

   **⚠️ FALLBACK — if subagent fails or is unavailable (API key missing, agent not found):**
   Generate testing-strategy.md INLINE. Read the `stelow-workflow-testing-ai-code` skill
   and produce the testing-strategy.md artifact directly in the current context.
   Do NOT skip — the testing strategy gates are required for execution.

2. **Add test-* scopes to spec-tech.md based on appetite:**

| Appetite | Add test scopes |
|----------|----------------|
| `Lean` | `test-behavior` (1 E2E test for happy path); `test-unit` for critical business logic; optional `test-integration` only when an external seam is in IN scope; `test-security` only for auth/payment/data in IN scope. |
| `Core` | `test-behavior` (E2E for happy path + key variations); `test-unit` for main logic; `test-integration` for DB/API/external services; `test-security` for sensitive paths. |
| `Complete` | `test-behavior` (full E2E coverage + edge cases); `test-unit`, `test-integration`, `test-security`. |

**Note on TDD:** Research shows TDD alone is insufficient for AI-generated code.
- Use TDD for critical business logic (isolated, deterministic)
- Use Test-After + risk-based tests for standard paths
- Never use same AI for both code AND test generation

### planning:30 — Tech Planning Review Gate

**⚠️ MANDATORY — ALWAYS run gate. Never skip.**

Spec-tech is a distinct artifact: scopes, sequencing, dependencies, DoDs, and testing strategy
were never reviewed visually in earlier phases. Prior gates (spec-product, interfaces) do NOT
cover spec-tech content.

**Run visual review gate for the tech plan BEFORE generating goals:**

Prefer the `visual_review` tool. Fall back to bash CLI if tool unavailable:

```
# Primary (tool):
visual_review filePath=.stelow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_v{N}.md

# Fallback (bash):
visual_review annotate .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_v{N}.md --gate --json
```

See `../stelow-workflow-orchestrator/references/cli-tools/visual_review.md` for command format, after-approval workflow, and frozen file rules.

| Scenario | Action |
|---------|--------|
| **Always** | Run visual review gate for spec-tech |
| visual review unavailable | Fallback: use `ask_user_question` to present scopes, sequencing, DoDs, and ask for explicit approval |

**If approved:**
1. Stamp `approved: true, approved_at: ...` in spec-tech frontmatter
2. Receipt is auto-created by the tool at `.stelow/approvals/{_dir}/gate-approved.md`
3. Proceed to Goal Generation

**If user requests changes:**
1. Adjust the tech plan
2. Re-submit via the visual review gate command (see `../stelow-workflow-orchestrator/references/cli-tools/visual_review.md`)
3. Repeat until approved

### planning:40 — Goal Generation

After tech plan approval, convert each scope into a **goal**
using the goals tool (see `../stelow-workflow-orchestrator/references/cli-tools/goals.md`). Goals are mandatory —
never use simple todo lists as a substitute; goals carry DoD, ACs, dependencies,
verification commands, and evidence types that todo items cannot express.

**For each feature/test scope in the approved spec-tech.md:**

Create a goal using the goals tool (see `../stelow-workflow-orchestrator/references/cli-tools/goals.md`).
The goals reference documents acceptance patterns, evidence types, verify commands,
and CLI fallbacks.

**Optimization scopes with metrics:**
These become optimization goals using the goals tool
(see `../stelow-workflow-orchestrator/references/cli-tools/goals.md` → Optimization Goals section).

**Rules:**
- Scopes with dependencies: create goal AFTER the dependency is complete
- Use the goal pause command (see `../stelow-workflow-orchestrator/references/cli-tools/goals.md`) if a scope gets blocked
- Use the goal tweak command (see `../stelow-workflow-orchestrator/references/cli-tools/goals.md`) for scope adjustments during execution
- ⚠️ **Never substitute todo items for goals** — goals carry structured DoDs, ACs, and dependency tracking

## Output

Tech plan is saved to:
```
.stelow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_{v}.md
```

## After Tech Planning — EXECUTE AUTOMATICALLY

**DO NOT ask user what to do next. Execution is automatic.**

### ⛔ STOP — Mandatory Scope Executor Routing

**Before implementing ANY scope, route through the scope executor.**
The scope executor determines the correct tool and execution mode for each scope type.
Do NOT start implementing scopes directly — always go through scope executor first.

**planning:50.10 — Load the scope executor skill**
```text
Read the stelow-workflow-scope-executor skill for routing rules.
```

**planning:50.20 — Route each scope by type**

| Scope type | Route to |
|------------|----------|
| `feature` | worker + iteration loop (see scope-executor Step 3 — implement → verify → review → quality, repeat) + supervision (see `../stelow-workflow-orchestrator/references/cli-tools/supervise.md`) |
| `optimization` | subagent + acceptance with benchmark verify (see `../stelow-workflow-orchestrator/references/cli-tools/goals.md` → Optimization Goals) |
| `spike` | scout + researcher (see `../stelow-workflow-orchestrator/references/cli-tools/subagents.md`) |
| `test-*` | subagent + acceptance (see `../stelow-workflow-orchestrator/references/cli-tools/goals.md`) with testing gates |

See `../stelow-workflow-orchestrator/stages/execution.md` for full execution flow.

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
- **test-security**: security_findings == 0 on critical paths → BLOCK if found
- **test-integration**: flaky_rate < 5% → WARN if above

See the `stelow-workflow-testing-ai-code` skill

## Related Skills

- **stelow-workflow-shape-up**: Produces the shaped proposal
- **stelow-workflow-plan-critique**: Reviews the proposal before tech planning
- **stelow** (orchestrator): Coordinates this skill with execution

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

## Entry (mode detection)

When this skill loads, check for the stelow workflow marker:

```bash
if [ -n "$STELOW_WORKFLOW" ] && [ -n "$STELOW_STATE" ]; then
  echo "stelow: workflow mode (state=$STELOW_STATE)"
else
  echo "stelow: standalone mode (no STELOW_WORKFLOW marker)"
fi
```

In **standalone mode** (no marker), run the existing skill body unchanged.
In **workflow mode**, skip to `### Workflow slice` and emit a complete
`## Hand-off (workflow mode)` block at the end. See
`../stelow-workflow-entry/SKILL.md` for the full marker protocol.

## Hand-off (workflow mode)

```
stage          : planning
description    : Tech planning. Typed scopes + sequencing.
status         : <done|partial|blocked>
artifacts      : <paths created or modified>
next-candidate : plan-gate
gate           : none
rework-on      : scope
```

Workflow mode: emit the above Hand-off block verbatim, then stop. The
router skill consumes the next-candidate field and calls
`scripts/stelow advance <next-candidate>` to move state forward.

### Workflow slice

Workflow mode for the **planning** stage. Standalone behavior lives in
the rest of this file (unchanged). Summary:

> Tech planning. Typed scopes + sequencing.

Primary actions (per stages.yaml): `read, write`. Run only the actions that
produce the artifacts promised in `## Hand-off`; skip anything that does
not advance the workflow.

