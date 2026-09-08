## Execution Modes

This skill supports two modes, chosen at the start:

| Mode | Behavior |
|------|----------|
| **Full autonomous** | Execute all scopes without pausing. Report at the end. Best for overnight runs. |
| **Scope-by-scope** | Execute one scope, present results, ask to proceed. Best for interactive oversight. |

The default is **Full autonomous**. Ask the user if they want scope-by-scope instead.

---

## Workflow Position

This skill runs **after** the visual review gate approves the plan, replacing manual execution:

```
1. Shape Up Planning → spec-product.md (business rules, scope, risks)
2. [Optional] Interface Alternatives → interfaces.md (wireframes, proposals)
3. Product Critique → gap analysis on product spec + revision
4. visual review Gate → approves spec-product.md ← PRODUCT APPROVED
5. Tech Planning Sequencing → spec-tech.md (product context + tech scopes)
6. Execution Executor
   ├── Read spec-tech.md (has product context + typed scopes)
   ├── Report execution plan → user confirms
   ├── Execute features → iteration loop (worker + verify + review + quality, repeat until criteria met)
   ├── Execute optimizations → goals tool (see goals.md, Optimization Goals)
   ├── Execute spikes → scout + researcher
   └── Report consolidated results to execution-report.md
7. [HANDOFF] → Verification stage (full test suite, code review, UI/browser testing)
   See the `stelow-workflow-testing-execution` skill for the testing protocol.
```

---

## How to invoke

### With supervision (recommended for autonomous execution)

Activate execution steering (see `references/cli-tools/supervise.md`) before starting:
```text
Outcome: Execute the approved plan routing scopes correctly. Save report to execution-report.md.
```

After supervision confirms, load this skill.

### Without supervision

Read this SKILL.md and follow the steps directly.

### From a parent agent (programmatic)

Delegate to a subagent (see `references/cli-tools/subagents.md`):
- Agent: `delegate` or `worker`
- Skills: `stelow-workflow-scope-executor` + `goals` (optimization goals via subagent + acceptance)
- Context: fresh
- Reads: spec-tech.md + scope-contract.json (acceptance IS the contract; history is noise)

## Interaction with Tools

| Concern | Reference |
|---------|-----------|
| Goal creation and tracking | `references/cli-tools/goals.md` |
| Subagent delegation (worker, reviewer, scout, researcher) | `references/cli-tools/subagents.md` |
| Execution steering | `references/cli-tools/supervise.md` |
| Optimization goals | `references/cli-tools/goals.md` (Optimization Goals section) |
| Visual review gate | `references/cli-tools/visual_review.md` |

## Environment Adaptation

If a tool is unavailable, check:
`references/cli-tools/`

## Input Detection (Standalone Mode)

When called outside the workflow with no pre-approved spec-tech.md:

```
Input:
  ├── User provided a spec-tech*.md path?
  │   └→ Read it, parse scopes by [TYPE], build execution plan
  ├── User described scopes verbally?
  │   └→ Extract scope types, objectives, dependencies manually
  └── No structured input?
      └→ Ask: "What approved plan should I execute?
         Provide the path to a spec-tech*.md file, or
         describe the scopes you want me to execute."
```

Once input is resolved, proceed to Step 1: Read and parse the plan.

---

## Output Expectations

Strong execution runs:
- **Respect dependency order** — no scope starts before its dependencies
- **Use the right tool for each type** — iteration loop for features, goals tool for optimization, scout for spikes
- **Handle failures gracefully** — one failed scope doesn't block the rest
- **Produce a clear final report** — what was done, what changed, what failed

Weak execution runs:
- **Run everything sequentially** when parallel is safe
- **Treat optimization scopes as plain worker tasks instead of using the goals tool** (loses the optimization loop advantage)
- **Ignore scope types** and treat everything as implementation
- **Block on minor failures** or reviewer feedback

