# Tool: Goal System

> **Built-in:** pi-subagents `subagent()` tool supports acceptance-based goals natively
> (see `acceptance` parameter with `criteria`, `evidence`, `verify`, `review`, `stopRules`)
> **Fallback:** Other CLIs use `/sisyphus`, `/goals` commands when native is unavailable

---

## Core Concept: Goals = acceptance contracts

Every scope type becomes a `subagent()` call with an acceptance contract.
No separate extensions needed — pi-subagents acceptance handles it all.

| Scope Type | How it becomes a goal |
|------------|----------------------|
| \`feature\` | worker + iteration loop (see scope-executor Step 3) |
| \`spike\` | scout + researcher (see subagents.md) |
| `optimization` | subagent + acceptance with **benchmark verify** commands (see Optimization Goals below) |
| `test-*` | subagent + acceptance with testing/security gates |

---

## Subagent with acceptance (preferred for pi)

Pass an acceptance contract directly to `subagent()`:

```typescript
subagent({
  agent: "worker",
  task: "Implement X from the approved scope",
  acceptance: {
    criteria: [
      { id: "SC-1", must: "Feature X works", severity: "required" },
      { id: "SC-2", must: "Tests pass", severity: "required" }
    ],
    evidence: ["changed-files", "tests-added", "commands-run"],
    verify: [
      { id: "V-1", command: "go test ./..." }
    ]
  }
})
```

This replaces the need for external goal packages *and* autoresearch extensions.

---

## Command Variants (Fallback for other CLIs)

When the native goal system is not available, four CLI modes exist:

| Semantic name | Command | Discussion | Preserves order | Best for |
|---------------|---------|-------------|-----------------|----------|
| **ordered-execution-goal** | `/sisyphus-set` | No | ✅ | Post-approval execution, automatic workflow |
| **ordered-discussion-goal** | `/sisyphus` | Yes | ✅ | Discuss before executing, blocked needs clarification |
| **flexible-execution-goal** | `/goals-set` | No | ❌ | Open-ended work without fixed sequence |
| **flexible-discussion-goal** | `/goals` | Yes | ❌ | Vague objectives needing research/grill |

### When to use each

```
After Tech Planning approval:
  → ordered-execution-goal (/sisyphus-set) — no discussion, starts immediately

During execution, blocked:
  → ordered-discussion-goal (/sisyphus) — stop and ask

Exploratory work:
  → flexible-discussion-goal (/goals) or flexible-execution-goal (/goals-set)
```

---

## Optimization Goals (replaces autoresearch/experiment-loop)

**Optimization scopes are goals with benchmark `verify` commands.**
The same `subagent() + acceptance` pattern handles optimization — no separate
experiment-loop extension needed.

### How it works

```
1. Baseline → subagent runs benchmark via acceptance verify
2. Mutate → subagent tries an improvement
3. Measure → acceptance verify runs benchmark again
4. Compare → parent agent decides keep/revert based on metric
5. Repeat → if target not met, launch next iteration with updated context
```

### Pattern

```typescript
subagent({
  agent: "worker",
  task: "Optimize function F for speed. Current baseline: 200µs.",
  acceptance: {
    criteria: [
      { id: "OPT-1", must: "Function F performance improves measurably", severity: "required" },
      { id: "OPT-2", must: "Tests still pass", severity: "required" }
    ],
    evidence: ["changed-files", "commands-run", "validation-output"],
    verify: [
      { id: "benchmark", command: "go test -bench=. -benchtime=100x ./pkg/" },
      { id: "tests", command: "go test ./..." }
    ],
    stopRules: ["Do not change public API signatures"]
  }
})
```

### Iteration loop in the parent agent

The parent orchestrator runs the iteration loop:

```typescript
// Iteration 1: try an improvement
const result = subagent({
  agent: "worker",
  task: `Optimize ${metric}. Baseline: ${baseline}. Try: pool goroutines.`,
  acceptance: { ... }  // with benchmark verify
})

// Compare metric from result output
if (result.metric < baseline) {
  // KEEP — commit accepted
} else {
  // REVERT — discard the change
}

// If target not met, iterate with context memory
subagent({
  agent: "worker",
  task: `Optimize ${metric}. Previous attempt did not meet target. Try: different approach.`,
  acceptance: { ... }
})
```

### Self-contained optimization agent

The pattern above can be packaged as a project agent (`optimizer`) that runs the
full try → measure → compare loop autonomously. It accepts the objective,
metric command, and stopping condition as task parameters.

---

## When to Use

| Stage | Purpose |
|-------|---------|
| Execution stage | Scoped implementation per scope |
| Verification stage | Run full test suite, code review, UI/browser testing |
| Execution Critique stage | Verify implementation, gap analysis |
| After Tech Planning | Each scope becomes a goal |

---

## Scope Types

| Type | Description | Executor |
|------|-------------|----------|
| \`feature\` | New functionality | worker + iteration loop (see scope-executor Step 3) |
| `optimization` | Measurable metric improvement | subagent + acceptance (benchmark verify + iteration loop) |
| `spike` | Research/prototype | subagent + acceptance |
| `test-unit` | Unit tests with coverage/risk gates | subagent + acceptance + testing gates |
| `test-integration` | Integration tests with real dependencies | subagent + acceptance + testing gates |
| `test-security` | SAST and security gates | subagent + acceptance + testing gates |
| `test-behavior` | Behavioral testing for agent workflows | subagent + acceptance + testing gates |

---

## Pattern for feature/spike goals

```typescript
subagent({
  agent: "worker",
  task: `Scope: login
Objective: implement email/password login
DoD: login flow works with valid credentials, rejects invalid`,
  acceptance: {
    criteria: [
      { id: "SC-1", must: "Login with valid credentials works", severity: "required" },
      { id: "SC-2", must: "Invalid credentials rejected with error", severity: "required" }
    ],
    evidence: ["changed-files", "tests-added", "commands-run", "residual-risks"],
    verify: [{ id: "tests", command: "go test ./..." }]
  }
})
```

### Test Scope Goals (test-* scopes)

```typescript
subagent({
  agent: "worker",
  task: `Scope: test-unit-login
Objective: Generate unit tests for critical paths
DoD: critical-path tests cover happy path and negative cases`,
  acceptance: {
    criteria: [
      { id: "TG-1", must: "Critical-path tests cover happy path and negative cases", severity: "required" },
      { id: "TG-2", must: "Security findings == 0 on critical paths", severity: "required" }
    ],
    evidence: ["changed-files", "tests-added", "commands-run", "validation-output"],
    verify: [
      { id: "tests", command: "npm test" },
      { id: "security", command: "gosec ./..." }
    ]
  }
})
```

---

## Testing Gates

| Gate | Condition | Action |
|------|-----------|--------|
| Critical Path Tests | missing required tests | 🔴 BLOCK |
| Security | > 0 critical | 🔴 BLOCK |
| Flaky Rate | > 5% | 🟡 WARN |

---

## Fallback (Other Harnesses)

If both subagent acceptance and goal system are unavailable:
- Use todo tool for progress tracking
- Create checkpoint files for resume
- Mark `[DONE:n]` in responses

**Abstraction:** "Goal with typed scopes and acceptance criteria"

---

## Related

- Execution stage (see `stages/execution.md`)
- Verification stage (see `stages/verification.md`)
- spec-tech scopes
- Testing strategy (see the `cali-product-testing-ai-code` skill)
- Testing protocol (see the `cali-product-testing-execution` skill)

